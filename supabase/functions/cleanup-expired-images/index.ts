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

  // 만료된 이미지 조회 (batch)
  const { data: expired, error: fetchError } = await db
    .from("images")
    .select("id, file_id")
    .lt("expires_at", new Date().toISOString())
    .is("deleted_at", null)
    .limit(BATCH_LIMIT);

  if (fetchError) {
    return jsonResponse(500, { error: fetchError.message });
  }

  if (!expired || expired.length === 0) {
    return jsonResponse(200, { deleted: 0, message: "No expired images found" });
  }

  const withFileId = expired.filter(
    (img): img is { id: string; file_id: string } =>
      typeof img.file_id === "string" && img.file_id.length > 0
  );
  const withoutFileId = expired.filter(
    (img) => !img.file_id
  );

  let imagekitDeletedCount = 0;
  let imagekitFailedIds: string[] = [];

  // ImageKit Bulk Delete
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

  // soft delete 대상: ImageKit 삭제 성공한 이미지 + file_id 없는 이미지
  const successfulIds = [
    ...withFileId
      .filter((img) => !imagekitFailedIds.includes(img.id))
      .map((img) => img.id),
    ...withoutFileId.map((img) => img.id),
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
  });
});
