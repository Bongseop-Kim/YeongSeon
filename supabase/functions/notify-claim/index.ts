import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import { createLogger } from "@/functions/_shared/logger.ts";
import { sendAlimtalk } from "@/functions/_shared/solapi.ts";

const { processLogger, errorLogger } = createLogger("notify-claim");

// 관리자만 호출 가능
Deno.serve(async (req) => {
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
  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

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
  const { data: claim } = await adminClient
    .from("claims")
    .select("status, order_id, orders(user_id)")
    .eq("id", claimId)
    .single();

  if (!claim) return jsonResponse(404, { error: "Claim not found" });

  const notifiableStatuses = ["완료", "거부"];
  if (!notifiableStatuses.includes(claim.status)) {
    return jsonResponse(200, { message: "알림 대상 상태 아님" });
  }

  const customerId = (claim.orders as { user_id: string } | null)?.user_id;
  if (!customerId) return jsonResponse(200, { message: "고객 ID 없음" });

  const { data: customerProfile } = await adminClient
    .from("profiles")
    .select("phone, phone_verified, notification_consent, notification_enabled")
    .eq("id", customerId)
    .single();

  if (
    !customerProfile?.notification_consent ||
    !customerProfile?.phone_verified ||
    !customerProfile?.notification_enabled ||
    !customerProfile?.phone
  ) {
    return jsonResponse(200, { message: "알림 수신 비활성화 상태" });
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

  const isDone = claim.status === "완료";
  const templateId = isDone
    ? (Deno.env.get("SOLAPI_TEMPLATE_CLAIM_DONE") ?? "")
    : (Deno.env.get("SOLAPI_TEMPLATE_CLAIM_REJECTED") ?? "");
  const fallbackContent = isDone
    ? `[영선] 클레임이 처리 완료되었습니다.`
    : `[영선] 클레임 요청이 거부되었습니다. 자세한 내용은 앱에서 확인해주세요.`;

  const sent = await sendAlimtalk({
    to: customerProfile.phone,
    templateId,
    variables: {},
    fallbackContent,
  });

  if (!sent) {
    errorLogger("send_failed", new Error("sendAlimtalk returned false"), {
      claimId,
      notificationLogId: notificationLog?.id ?? null,
    });
  }

  processLogger("notified", {
    claimId,
    status: claim.status,
    notificationLogId: notificationLog?.id ?? null,
  });
  return jsonResponse(200, { message: "알림 발송 완료" });
});
