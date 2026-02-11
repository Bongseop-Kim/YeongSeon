import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type OrderItemInput = {
  item_id: string;
  item_type: "product" | "reform";
  product_id: number | null;
  selected_option_id: string | null;
  reform_data: {
    tie: {
      id: string;
      image?: string;
      measurementType?: "length" | "height";
      tieLength?: number;
      wearerHeight?: number;
      notes?: string;
      checked?: boolean;
    };
    cost: number;
  } | null;
  quantity: number;
  applied_user_coupon_id: string | null;
};

type CreateOrderInput = {
  shipping_address_id: string;
  items: OrderItemInput[];
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const validateItemShape = (item: OrderItemInput) => {
  if (!item.item_id || !item.item_type) {
    throw new Error("Invalid order item");
  }
  if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
    throw new Error("Invalid item quantity");
  }
  if (item.item_type === "product") {
    if (item.product_id == null) {
      throw new Error("Product id is required");
    }
    return;
  }
  if (!item.reform_data) {
    throw new Error("Reform data is required");
  }
};

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

  let payload: CreateOrderInput;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!payload?.shipping_address_id || !Array.isArray(payload.items)) {
    return jsonResponse(400, { error: "Invalid request payload" });
  }
  if (payload.items.length === 0) {
    return jsonResponse(400, { error: "Order items are required" });
  }

  try {
    for (const item of payload.items) {
      validateItemShape(item);
    }
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Invalid order item",
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

  const { data: orderResult, error: orderError } = await supabase.rpc(
    "create_order_txn",
    {
      p_shipping_address_id: payload.shipping_address_id,
      p_items: payload.items,
    }
  );

  if (orderError || !orderResult) {
    const status = orderError?.code === "P0001" ? 400 : 500;
    return jsonResponse(status, {
      error: orderError?.message ?? "Failed to create order",
    });
  }

  return jsonResponse(200, orderResult);
});
