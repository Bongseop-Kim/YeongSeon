import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  isJsonPayloadWithinLimit,
  normalizeOptionalUuid,
} from "@/functions/_shared/validation.ts";

type CreateSampleOrderInput = {
  shipping_address_id: string;
  sample_type: "fabric" | "sewing" | "fabric_and_sewing";
  options: Record<string, unknown>;
  reference_images?: Array<{ url: string; file_id?: string | null }>;
  additional_notes?: string;
  user_coupon_id?: string;
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);

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
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(500, { error: "Missing Supabase configuration" });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let payload: CreateSampleOrderInput;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (
    !payload?.shipping_address_id ||
    !payload.options ||
    (payload.sample_type !== "fabric" &&
      payload.sample_type !== "sewing" &&
      payload.sample_type !== "fabric_and_sewing")
  ) {
    return jsonResponse(400, { error: "Invalid request payload" });
  }

  if (!isJsonPayloadWithinLimit(payload.options)) {
    return jsonResponse(413, { error: "Options payload too large" });
  }

  const normalizedCouponId = normalizeOptionalUuid(payload.user_coupon_id);
  if (!normalizedCouponId.isValid) {
    return jsonResponse(400, {
      error: "user_coupon_id must be a valid UUID",
    });
  }

  const { data: shippingAddress, error: shippingError } = await supabase
    .from("shipping_addresses")
    .select("id")
    .eq("id", payload.shipping_address_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (shippingError) {
    return jsonResponse(500, { error: "Failed to load shipping address" });
  }
  if (!shippingAddress) {
    return jsonResponse(403, { error: "Shipping address not found" });
  }

  const referenceImages = Array.isArray(payload.reference_images)
    ? payload.reference_images.map((image) => ({
        url: image.url,
        ...(typeof image.file_id === "string" && image.file_id.length > 0
          ? { file_id: image.file_id }
          : {}),
      }))
    : [];

  const { data: orderResult, error: orderError } = await supabase.rpc(
    "create_sample_order_txn",
    {
      p_shipping_address_id: payload.shipping_address_id,
      p_sample_type: payload.sample_type,
      p_options: payload.options,
      p_reference_images: referenceImages,
      p_additional_notes: payload.additional_notes ?? "",
      p_user_coupon_id: normalizedCouponId.value,
    },
  );

  if (orderError || !orderResult) {
    const status = orderError?.code === "P0001" ? 400 : 500;
    return jsonResponse(status, {
      error: orderError?.message ?? "Failed to create sample order",
    });
  }

  const orderId =
    typeof orderResult === "object" &&
    orderResult !== null &&
    "order_id" in orderResult &&
    typeof orderResult.order_id === "string"
      ? orderResult.order_id
      : null;

  if (!orderId) {
    return jsonResponse(500, { error: "Missing order_id in RPC response" });
  }

  const { data: createdOrder, error: createdOrderError } = await supabase
    .from("orders")
    .select("total_price")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (createdOrderError) {
    return jsonResponse(500, {
      error: "Failed to load created order amount",
    });
  }

  if (!createdOrder || typeof createdOrder.total_price !== "number") {
    return jsonResponse(500, {
      error: "Created order amount is missing or invalid",
    });
  }

  return jsonResponse(200, {
    ...orderResult,
    total_amount: createdOrder.total_price,
  });
});
