import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type CreateSampleOrderInput = {
  shipping_address_id: string;
  sample_type: "fabric" | "sewing" | "fabric_and_sewing";
  options: Record<string, unknown>;
  reference_images?: Array<{ url: string; fileId: string }>;
  additional_notes?: string;
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

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
    "create_sample_order_txn",
    {
      p_shipping_address_id: payload.shipping_address_id,
      p_sample_type: payload.sample_type,
      p_options: payload.options,
      p_reference_images: payload.reference_images ?? [],
      p_additional_notes: payload.additional_notes ?? "",
    },
  );

  if (orderError || !orderResult) {
    const status = orderError?.code === "P0001" ? 400 : 500;
    return jsonResponse(status, {
      error: orderError?.message ?? "Failed to create sample order",
    });
  }

  return jsonResponse(200, orderResult);
});
