import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type ConfirmPaymentRequest = {
  paymentKey: string;
  orderId: string; // payment_group_id
  amount: number;
};

type TossConfirmResponse = {
  status?: string;
  [key: string]: unknown;
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

const sanitizeTossResponse = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  const copy = { ...obj };
  if (typeof copy.paymentKey === "string") {
    copy.paymentKey = maskPaymentKey(copy.paymentKey);
  }
  if (typeof copy.secret === "string") {
    copy.secret = "****";
  }
  return copy;
};

const processLogger = (step: string, payload: Record<string, unknown>) => {
  console.log(`[confirm-payment:${step}]`, JSON.stringify(payload));
};

const errorLogger = (
  step: string,
  error: unknown,
  payload: Record<string, unknown> = {}
) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[confirm-payment:${step}]`,
    JSON.stringify({
      ...payload,
      error: message,
    })
  );
};

const isConfirmPaymentRequest = (
  payload: unknown
): payload is ConfirmPaymentRequest => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.paymentKey === "string" &&
    candidate.paymentKey.length > 0 &&
    typeof candidate.orderId === "string" &&
    candidate.orderId.length > 0 &&
    typeof candidate.amount === "number" &&
    Number.isFinite(candidate.amount)
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
    return jsonResponse(500, { error: "Missing Supabase/Toss configuration" });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let payload: ConfirmPaymentRequest;
  try {
    const body = await req.json();
    if (!isConfirmPaymentRequest(body)) {
      return jsonResponse(400, { error: "Invalid request payload" });
    }
    payload = body;
  } catch (error) {
    errorLogger("invalid_json", error);
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!Number.isInteger(payload.amount) || payload.amount <= 0) {
    return jsonResponse(400, { error: "Invalid amount" });
  }

  processLogger("request_received", {
    userId: user.id,
    paymentGroupId: payload.orderId,
    amount: payload.amount,
    paymentKey: maskPaymentKey(payload.paymentKey),
  });

  // payment_group_id로 주문 그룹 조회
  const { data: orders, error: ordersError } = await adminClient
    .from("orders")
    .select("id, user_id, total_price, status, order_type")
    .eq("payment_group_id", payload.orderId);

  if (ordersError) {
    errorLogger("orders_lookup_failed", ordersError, {
      paymentGroupId: payload.orderId,
      userId: user.id,
    });

    if (ordersError.code === "22P02") {
      return jsonResponse(400, { error: "Invalid payment group id" });
    }

    return jsonResponse(500, { error: "Failed to load orders" });
  }

  if (!orders || orders.length === 0) {
    return jsonResponse(404, { error: "Orders not found" });
  }

  const typedOrders = orders as Array<{
    id: string;
    user_id: string;
    total_price: number;
    status: string;
    order_type: string;
  }>;
  const allowedPrePaymentStatuses = new Set(["대기중", "pending", "created"]);

  // 소유권 + 상태 검증
  for (const order of typedOrders) {
    if (order.user_id !== user.id) {
      return jsonResponse(403, { error: "Forbidden" });
    }
    if (!allowedPrePaymentStatuses.has(order.status)) {
      errorLogger(
        "invalid_order_status",
        new Error("Order is not in payable state"),
        {
          orderId: order.id,
          userId: user.id,
          orderStatus: order.status,
        }
      );
      return jsonResponse(409, {
        error: "Order is not payable",
        orderId: order.id,
      });
    }
  }

  // 금액 검증: 전체 주문 합계
  const totalAmount = typedOrders.reduce(
    (sum, o) => sum + o.total_price,
    0
  );

  if (totalAmount !== payload.amount) {
    processLogger("amount_mismatch", {
      paymentGroupId: payload.orderId,
      requestedAmount: payload.amount,
      dbAmount: totalAmount,
      userId: user.id,
    });

    return jsonResponse(400, {
      error: "Amount mismatch",
      paymentGroupId: payload.orderId,
    });
  }

  const tossAuth = `Basic ${btoa(`${tossSecretKey}:`)}`;

  let tossResult: TossConfirmResponse;
  try {
    const tossResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: tossAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey: payload.paymentKey,
          orderId: payload.orderId,
          amount: totalAmount,
        }),
      }
    );

    const responseText = await tossResponse.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = responseText
        ? (JSON.parse(responseText) as Record<string, unknown>)
        : {};
    } catch {
      parsed = { raw: responseText };
    }

    if (!tossResponse.ok) {
      processLogger("payment_confirm_rejected", {
        paymentGroupId: payload.orderId,
        paymentKey: maskPaymentKey(payload.paymentKey),
        status: tossResponse.status,
        response: sanitizeTossResponse(parsed),
      });

      return jsonResponse(tossResponse.status, {
        error: "Payment confirmation rejected",
        details: parsed,
      });
    }

    tossResult = parsed as TossConfirmResponse;
  } catch (error) {
    errorLogger("payment_confirm_failed", error, {
      paymentGroupId: payload.orderId,
      paymentKey: maskPaymentKey(payload.paymentKey),
    });
    return jsonResponse(502, { error: "Failed to confirm payment" });
  }

  const { data: rpcResult, error: rpcError } = await adminClient
    .rpc("confirm_payment_orders", {
      p_payment_group_id: payload.orderId,
      p_user_id: user.id,
      p_payment_key: payload.paymentKey,
    });

  if (rpcError) {
    errorLogger("order_update_failed", rpcError, {
      paymentGroupId: payload.orderId,
      userId: user.id,
      paymentKey: maskPaymentKey(payload.paymentKey),
    });
    if (rpcError.message?.includes("not payable")) {
      return jsonResponse(409, {
        error: "Payment confirmed but order state changed",
      });
    }
    if (rpcError.message?.includes("Forbidden")) {
      return jsonResponse(403, { error: "Forbidden" });
    }
    return jsonResponse(500, {
      error: "Payment confirmed but order update failed",
    });
  }

  if (
    !rpcResult ||
    typeof rpcResult !== "object" ||
    !("orders" in rpcResult) ||
    !Array.isArray(rpcResult.orders)
  ) {
    errorLogger("unexpected_rpc_result", new Error("Invalid rpc result shape"), {
      paymentGroupId: payload.orderId,
    });
    return jsonResponse(500, { error: "Unexpected order update response" });
  }

  const updatedOrders = (
    rpcResult as {
      success: boolean;
      orders: Array<{ orderId: string; orderType: string }>;
    }
  ).orders;

  processLogger("payment_confirmed", {
    paymentGroupId: payload.orderId,
    userId: user.id,
    paymentKey: maskPaymentKey(payload.paymentKey),
    amount: totalAmount,
    orderCount: updatedOrders.length,
    paymentStatus: tossResult.status ?? "UNKNOWN",
  });

  return jsonResponse(200, {
    paymentKey: payload.paymentKey,
    paymentGroupId: payload.orderId,
    orders: updatedOrders,
    status: tossResult.status ?? "DONE",
  });
});
