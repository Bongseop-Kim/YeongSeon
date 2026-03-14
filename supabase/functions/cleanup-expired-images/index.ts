import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const IMAGEKIT_DELETE_URL =
  "https://api.imagekit.io/v1/files/batch/deleteByFileIds";
const BATCH_LIMIT = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret) {
    return jsonResponse(500, { error: "CRON_SECRET not configured" });
  }

  if (req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const imagekitPrivateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase configuration" });
  }
  if (!imagekitPrivateKey) {
    return jsonResponse(500, { error: "Missing ImageKit configuration" });
  }

  const db = createClient(supabaseUrl, serviceRoleKey);

  // 만료된 이미지 조회 (batch):
  // - 새로 만료된 행 (expires_at < now, deleted_at IS NULL, deletion_claimed_at IS NULL)
  // - 이전 실행에서 claim했으나 finalize 실패한 행 (deletion_claimed_at IS NOT NULL, deleted_at IS NULL)
  const now = new Date().toISOString();
  const { data: expired, error: fetchError } = await db
    .from("images")
    .select("id, file_id, deletion_claimed_at")
    .is("deleted_at", null)
    .or(`expires_at.lt.${now},deletion_claimed_at.not.is.null`)
    .limit(BATCH_LIMIT);

  if (fetchError) {
    return jsonResponse(500, { error: fetchError.message });
  }

  if (!expired || expired.length === 0) {
    return jsonResponse(200, {
      deleted: 0,
      message: "No expired images found",
    });
  }

  // 이전 실행에서 claim된 행: ImageKit 삭제 없이 바로 finalize 대상
  const previouslyClaimed = expired.filter(
    (img) => img.deletion_claimed_at != null,
  );
  // 새로 claim할 행
  const unclaimed = expired.filter((img) => img.deletion_claimed_at == null);

  // claim 단계: unclaimed 행을 ImageKit 삭제 전에 먼저 DB에 기록한다.
  // claim이 실패하면 ImageKit 삭제를 진행하지 않는다.
  if (unclaimed.length > 0) {
    const { error: claimError } = await db
      .from("images")
      .update({ deletion_claimed_at: now })
      .in(
        "id",
        unclaimed.map((img) => img.id),
      );

    if (claimError) {
      return jsonResponse(500, { error: claimError.message });
    }
  }

  // previouslyClaimed 행은 이전 실행에서 ImageKit 삭제를 시도했으므로
  // 재시도 없이 바로 finalize한다 (file_id 유무에 관계없이).
  const previouslyClaimedIds = previouslyClaimed.map((img) => img.id);

  // 신규 claim 행 중 file_id가 있는 것만 ImageKit 삭제 대상
  const withFileId = unclaimed.filter(
    (img): img is { id: string; file_id: string; deletion_claimed_at: null } =>
      typeof img.file_id === "string" && img.file_id.length > 0,
  );
  const withoutFileId = unclaimed.filter((img) => !img.file_id);

  let imagekitDeletedCount = 0;
  let imagekitFailedIds: string[] = [];

  // ImageKit Bulk Delete (신규 claim 행 중 file_id 있는 것만)
  if (withFileId.length > 0) {
    const credentials = btoa(`${imagekitPrivateKey}:`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const deleteRes = await fetch(IMAGEKIT_DELETE_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileIds: withFileId.map((img) => img.file_id),
        }),
        signal: controller.signal,
      });

      if (deleteRes.ok) {
        const body = await deleteRes.json();
        const deletedFileIds: string[] = body.successfullyDeletedFileIds ?? [];
        imagekitDeletedCount = deletedFileIds.length;
        imagekitFailedIds = withFileId
          .filter((img) => !deletedFileIds.includes(img.file_id))
          .map((img) => img.id);
      } else {
        // 부분 실패 처리: 삭제 성공한 file_id를 확인할 수 없으므로 모두 실패 처리
        const errorBody = await deleteRes.text();
        console.error("ImageKit bulk delete failed:", errorBody);
        imagekitFailedIds = withFileId.map((img) => img.id);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.error("ImageKit bulk delete timed out after 30 seconds");
        imagekitFailedIds = withFileId.map((img) => img.id);
      } else {
        console.error("ImageKit bulk delete threw an unexpected error", {
          operation: "ImageKit bulk delete",
          error,
          ids: withFileId.map((img) => img.id),
        });
        return jsonResponse(500, { error: (error as Error).message });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // finalize 대상:
  // - ImageKit 삭제 성공한 신규 claim 행
  // - file_id 없는 신규 claim 행
  // - 이전 실행에서 이미 claim된 행 (이전 finalize 실패 → 재시도)
  const successfulIds = [
    ...withFileId
      .filter((img) => !imagekitFailedIds.includes(img.id))
      .map((img) => img.id),
    ...withoutFileId.map((img) => img.id),
    ...previouslyClaimedIds,
  ];

  if (successfulIds.length > 0) {
    const { error: updateError } = await db
      .from("images")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", successfulIds);

    if (updateError) {
      return jsonResponse(500, { error: updateError.message });
    }
  }

  return jsonResponse(200, {
    deleted: successfulIds.length,
    imagekitDeleted: imagekitDeletedCount,
    imagekitFailed: imagekitFailedIds.length,
    legacyDeleted: withoutFileId.length,
    retriedFromClaim: previouslyClaimedIds.length,
  });
});
