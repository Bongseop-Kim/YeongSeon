import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type CreateCustomOrderInput = {
  shipping_address_id: string;
  options: Record<string, unknown>;
  sewing_cost: number;
  fabric_cost: number;
  total_cost: number;
  quantity: number;
  reference_image_urls?: string[];
  additional_notes?: string;
  sample?: boolean;
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
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

  let payload: CreateCustomOrderInput;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!payload?.shipping_address_id || !payload.options) {
    return jsonResponse(400, { error: "Invalid request payload" });
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity <= 0) {
    return jsonResponse(400, { error: "Invalid quantity" });
  }

  if (!Number.isInteger(payload.total_cost) || payload.total_cost < 0) {
    return jsonResponse(400, { error: "Invalid total cost" });
  }

  // 배송지 소유 검증
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

  const { data: orderResult, error: orderError } = await supabase.rpc(
    "create_custom_order_txn",
    {
      p_shipping_address_id: payload.shipping_address_id,
      p_options: payload.options,
      p_sewing_cost: payload.sewing_cost,
      p_fabric_cost: payload.fabric_cost,
      p_total_cost: payload.total_cost,
      p_quantity: payload.quantity,
      p_reference_image_urls: payload.reference_image_urls ?? [],
      p_additional_notes: payload.additional_notes ?? "",
      p_sample: payload.sample ?? false,
    }
  );

  if (orderError || !orderResult) {
    const status = orderError?.code === "P0001" ? 400 : 500;
    return jsonResponse(status, {
      error: orderError?.message ?? "Failed to create custom order",
    });
  }

  return jsonResponse(200, orderResult);
});
