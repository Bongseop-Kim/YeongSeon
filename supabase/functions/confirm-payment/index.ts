import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type ConfirmPaymentRequest = {
  paymentKey: string;
  orderId: string;
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
    orderId: payload.orderId,
    amount: payload.amount,
    paymentKey: payload.paymentKey,
  });

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, user_id, total_price, status")
    .eq("id", payload.orderId)
    .maybeSingle();

  if (orderError) {
    errorLogger("order_lookup_failed", orderError, {
      orderId: payload.orderId,
      userId: user.id,
    });

    if (orderError.code === "22P02") {
      return jsonResponse(400, { error: "Invalid order id" });
    }

    return jsonResponse(500, { error: "Failed to load order" });
  }

  if (!order) {
    return jsonResponse(404, { error: "Order not found" });
  }

  const allowedPrePaymentStatuses = new Set(["대기중", "pending", "created"]);
  if (!allowedPrePaymentStatuses.has(order.status)) {
    errorLogger("invalid_order_status", new Error("Order is not in payable state"), {
      orderId: order.id,
      userId: user.id,
      orderStatus: order.status,
    });
    return jsonResponse(409, {
      error: "Order is not payable",
      orderId: order.id,
    });
  }

  if (order.user_id !== user.id) {
    return jsonResponse(403, { error: "Forbidden" });
  }

  if (order.total_price !== payload.amount) {
    processLogger("amount_mismatch", {
      orderId: order.id,
      requestedAmount: payload.amount,
      dbAmount: order.total_price,
      userId: user.id,
    });

    return jsonResponse(400, {
      error: "Amount mismatch",
      orderId: order.id,
    });
  }

  const serverAmount = order.total_price;

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
          amount: serverAmount,
        }),
      }
    );

    const responseText = await tossResponse.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
    } catch {
      parsed = { raw: responseText };
    }

    if (!tossResponse.ok) {
      processLogger("payment_confirm_rejected", {
        orderId: payload.orderId,
        paymentKey: payload.paymentKey,
        status: tossResponse.status,
        response: parsed,
      });

      return jsonResponse(tossResponse.status, {
        error: "Payment confirmation rejected",
        details: parsed,
      });
    }

    tossResult = parsed as TossConfirmResponse;
  } catch (error) {
    errorLogger("payment_confirm_failed", error, {
      orderId: payload.orderId,
      paymentKey: payload.paymentKey,
    });
    return jsonResponse(502, { error: "Failed to confirm payment" });
  }

  const { data: updatedOrder, error: updateError } = await adminClient
    .from("orders")
    .update({
      status: "진행중",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("user_id", user.id)
    .eq("status", order.status)
    .select("id")
    .maybeSingle();

  if (updateError) {
    errorLogger("order_update_failed", updateError, {
      orderId: order.id,
      userId: user.id,
      paymentKey: payload.paymentKey,
      originalStatus: order.status,
    });
    return jsonResponse(500, { error: "Payment confirmed but order update failed" });
  }

  if (!updatedOrder) {
    errorLogger("order_update_conflict", new Error("Order status changed before update"), {
      orderId: order.id,
      userId: user.id,
      expectedStatus: order.status,
      paymentKey: payload.paymentKey,
    });
    return jsonResponse(409, {
      error: "Payment confirmed but order state changed",
      orderId: order.id,
    });
  }

  processLogger("payment_confirmed", {
    orderId: order.id,
    userId: user.id,
    paymentKey: payload.paymentKey,
    amount: serverAmount,
    paymentStatus: tossResult.status ?? "UNKNOWN",
  });

  return jsonResponse(200, {
    paymentKey: payload.paymentKey,
    orderId: order.id,
    status: tossResult.status ?? "DONE",
  });
});
