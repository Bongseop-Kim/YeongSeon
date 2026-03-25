import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import { createLogger } from "@/functions/_shared/logger.ts";
import { sendAlimtalk } from "@/functions/_shared/solapi.ts";

const { processLogger, errorLogger } = createLogger("notify-claim");

/**
 * 클레임 처리 결과 알림 요청을 처리한다.
 * @param {Request} req Authorization 헤더와 `{ claimId: string }` JSON 본문을 포함한 HTTP 요청
 * @returns {Promise<Response>} 클레임 알림 처리 결과를 담은 JSON 응답
 */
export async function handleRequest(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);

  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse(401, { error: "Unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing configuration" });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) return jsonResponse(401, { error: "Unauthorized" });

  // 관리자 권한 확인
  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfileError) {
    errorLogger("admin_profile_lookup_failed", adminProfileError, {
      userId: user.id,
    });
    return jsonResponse(500, { error: "Internal server error" });
  }

  if (!["admin", "manager"].includes(adminProfile?.role ?? "")) {
    return jsonResponse(403, { error: "Forbidden" });
  }

  let claimId: string;
  try {
    const body = await req.json();
    claimId = body?.claimId ?? "";
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!claimId) return jsonResponse(400, { error: "claimId is required" });

  // 클레임 + 주문 소유자 + 상태 조회
  const { data: claim, error: claimError } = await adminClient
    .from("claims")
    .select("status, type, order_id, orders(user_id)")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) {
    errorLogger("claim_lookup_failed", claimError, {
      claimId,
      userId: user.id,
    });
    return jsonResponse(500, { error: "Internal server error" });
  }

  if (!claim) return jsonResponse(404, { error: "Claim not found" });

  const notifiableStatuses = ["완료", "거부"];
  if (!notifiableStatuses.includes(claim.status)) {
    return jsonResponse(200, { message: "알림 대상 상태 아님" });
  }

  const customerId = (claim.orders as { user_id: string } | null)?.user_id;
  if (!customerId) return jsonResponse(200, { message: "고객 ID 없음" });

  const { data: customerProfile, error: customerProfileError } =
    await adminClient
      .from("profiles")
      .select(
        "phone, phone_verified, notification_consent, notification_enabled",
      )
      .eq("id", customerId)
      .maybeSingle();

  if (customerProfileError) {
    errorLogger("customer_profile_lookup_failed", customerProfileError, {
      claimId,
      customerId,
    });
    return jsonResponse(500, { error: "Internal server error" });
  }

  if (
    !customerProfile?.notification_consent ||
    !customerProfile?.phone_verified ||
    !customerProfile?.notification_enabled ||
    !customerProfile?.phone
  ) {
    return jsonResponse(200, { message: "알림 수신 비활성화 상태" });
  }

  const { data: existingLog, error: existingLogError } = await adminClient
    .from("claim_notification_logs")
    .select("id")
    .eq("claim_id", claimId)
    .eq("status", claim.status)
    .maybeSingle();

  if (existingLogError) {
    errorLogger("notification_log_lookup_failed", existingLogError, {
      claimId,
      status: claim.status,
    });
    return jsonResponse(500, { error: "Internal server error" });
  }

  if (existingLog) {
    processLogger("duplicate_skipped", { claimId, status: claim.status });
    return jsonResponse(200, { message: "이미 발송된 상태 알림" });
  }

  const isDone = claim.status === "완료";
  const templateId = isDone
    ? (Deno.env.get("SOLAPI_TEMPLATE_CLAIM_DONE") ?? "")
    : (Deno.env.get("SOLAPI_TEMPLATE_CLAIM_REJECTED") ?? "");
  const fallbackContent = isDone
    ? `[ESSE SION] 클레임이 처리 완료되었습니다.\nhttps://essesion.shop/order/claim-list`
    : `[ESSE SION] 클레임 요청이 거부되었습니다. 자세한 내용은 아래 링크에서 확인해주세요.\nhttps://essesion.shop/order/claim-list`;

  const sent = await sendAlimtalk({
    to: customerProfile.phone,
    templateId,
    variables: isDone ? { "#{처리유형}": claim.type } : {},
    fallbackContent,
  });

  if (!sent) {
    errorLogger("send_failed", new Error("sendAlimtalk returned false"), {
      claimId,
      status: claim.status,
    });
    return jsonResponse(502, { error: "Notification delivery failed" });
  }

  const { data: notificationLog, error: notificationLogError } =
    await adminClient
      .from("claim_notification_logs")
      .insert({
        claim_id: claimId,
        status: claim.status,
      })
      .select("id")
      .maybeSingle();

  if (notificationLogError) {
    if (notificationLogError.code === "23505") {
      processLogger("duplicate_skipped", { claimId, status: claim.status });
      return jsonResponse(200, { message: "이미 발송된 상태 알림" });
    }

    errorLogger("notification_log_failed", notificationLogError, {
      claimId,
      status: claim.status,
    });
    return jsonResponse(500, { error: "Notification log insert failed" });
  }

  processLogger("notified", {
    claimId,
    status: claim.status,
    notificationLogId: notificationLog?.id ?? null,
  });
  return jsonResponse(200, { message: "알림 발송 완료" });
}

Deno.serve(handleRequest);
