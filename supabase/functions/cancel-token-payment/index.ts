import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type CancelTokenPaymentRequest = {
  refundRequestId: string;
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const maskPaymentKey = (key: string): string => {
  if (key.length <= 8) return "****";
  return `****${key.slice(-8)}`;
};

const processLogger = (step: string, payload: Record<string, unknown>) => {
  console.log(`[cancel-token-payment:${step}]`, JSON.stringify(payload));
};

const errorLogger = (
  step: string,
  error: unknown,
  payload: Record<string, unknown> = {}
) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[cancel-token-payment:${step}]`,
    JSON.stringify({ ...payload, error: message })
  );
};

const isCancelRequest = (payload: unknown): payload is CancelTokenPaymentRequest => {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.refundRequestId === "string" &&
    candidate.refundRequestId.length > 0
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !tossSecretKey) {
    return jsonResponse(500, { error: "Missing configuration" });
  }

  // Admin JWT 검증
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  // is_admin 확인
  const { data: profileData, error: profileError } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profileData || profileData.role !== "admin") {
    return jsonResponse(403, { error: "Forbidden: admin only" });
  }

  let payload: CancelTokenPaymentRequest;
  try {
    const body = await req.json();
    if (!isCancelRequest(body)) {
      return jsonResponse(400, { error: "Invalid request payload" });
    }
    payload = body;
  } catch (error) {
    errorLogger("invalid_json", error);
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 환불 요청 및 주문 정보 조회
  const { data: refundReqData, error: refundReqError } = await adminClient
    .from("token_refund_requests")
    .select("id, user_id, order_id, paid_token_amount, bonus_token_amount, refund_amount, status")
    .eq("id", payload.refundRequestId)
    .single();

  if (refundReqError || !refundReqData) {
    errorLogger("refund_request_lookup_failed", refundReqError ?? new Error("not found"), {
      refundRequestId: payload.refundRequestId,
    });
    return jsonResponse(404, { error: "Refund request not found" });
  }

  const refundReq = refundReqData as {
    id: string;
    user_id: string;
    order_id: string;
    paid_token_amount: number;
    bonus_token_amount: number;
    refund_amount: number;
    status: string;
  };

  if (refundReq.status !== "pending") {
    return jsonResponse(409, {
      error: `Refund request is not pending (status: ${refundReq.status})`,
    });
  }

  // 주문의 payment_key 조회
  const { data: orderData, error: orderError } = await adminClient
    .from("orders")
    .select("id, payment_key, total_price")
    .eq("id", refundReq.order_id)
    .single();

  if (orderError || !orderData) {
    errorLogger("order_lookup_failed", orderError ?? new Error("not found"), {
      orderId: refundReq.order_id,
    });
    return jsonResponse(404, { error: "Order not found" });
  }

  const order = orderData as { id: string; payment_key: string | null; total_price: number };

  if (!order.payment_key) {
    return jsonResponse(409, { error: "Order has no payment key" });
  }

  processLogger("refund_start", {
    refundRequestId: payload.refundRequestId,
    orderId: refundReq.order_id,
    refundAmount: refundReq.refund_amount,
    paymentKey: maskPaymentKey(order.payment_key),
    adminId: user.id,
  });

  // Toss API: 전액 취소 (cancelAmount 생략 = 전액)
  const tossAuth = `Basic ${btoa(`${tossSecretKey}:`)}`;

  let tossResponse: Response;
  try {
    tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(order.payment_key)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: tossAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason: "고객 토큰 환불 요청",
        }),
      }
    );
  } catch (error) {
    errorLogger("toss_cancel_failed", error, {
      refundRequestId: payload.refundRequestId,
      paymentKey: maskPaymentKey(order.payment_key),
    });
    return jsonResponse(502, { error: "Failed to cancel payment via Toss" });
  }

  const responseText = await tossResponse.text();
  let parsedToss: Record<string, unknown> = {};
  try {
    parsedToss = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
  } catch {
    parsedToss = { raw: responseText };
  }

  if (!tossResponse.ok) {
    processLogger("toss_cancel_rejected", {
      refundRequestId: payload.refundRequestId,
      paymentKey: maskPaymentKey(order.payment_key),
      status: tossResponse.status,
      response: parsedToss,
    });
    return jsonResponse(tossResponse.status, {
      error: "Toss payment cancellation rejected",
      details: parsedToss,
    });
  }

  processLogger("toss_cancel_success", {
    refundRequestId: payload.refundRequestId,
    paymentKey: maskPaymentKey(order.payment_key),
  });

  // Toss 취소 성공 → approve_token_refund RPC 호출
  const { error: approveError } = await adminClient.rpc("approve_token_refund", {
    p_request_id: payload.refundRequestId,
    p_admin_id: user.id,
  });

  if (approveError) {
    errorLogger("approve_token_refund_failed", approveError, {
      refundRequestId: payload.refundRequestId,
      adminId: user.id,
    });
    // Toss는 이미 취소됐으나 DB 처리 실패 — 수동 복구 필요
    return jsonResponse(500, {
      error: "Payment cancelled but DB update failed. Manual intervention required.",
      details: approveError.message,
    });
  }

  processLogger("refund_approved", {
    refundRequestId: payload.refundRequestId,
    orderId: refundReq.order_id,
    adminId: user.id,
    refundAmount: refundReq.refund_amount,
  });

  return jsonResponse(200, {
    success: true,
    refundRequestId: payload.refundRequestId,
    refundAmount: refundReq.refund_amount,
  });
});
