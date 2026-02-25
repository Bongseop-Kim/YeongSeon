import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type CreateQuoteRequestInput = {
  shipping_address_id: string;
  options: Record<string, unknown>;
  quantity: number;
  reference_image_urls?: string[];
  additional_notes?: string;
  contact_name: string;
  contact_title?: string;
  contact_method: string;
  contact_value: string;
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

  let payload: CreateQuoteRequestInput;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!payload?.shipping_address_id) {
    return jsonResponse(400, { error: "Shipping address is required" });
  }

  if (
    !payload.options ||
    typeof payload.options !== "object" ||
    Array.isArray(payload.options)
  ) {
    return jsonResponse(400, { error: "Options must be a non-null object" });
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 100) {
    return jsonResponse(400, { error: "Quantity must be 100 or more" });
  }

  if (
    payload.reference_image_urls !== undefined &&
    (!Array.isArray(payload.reference_image_urls) ||
      !payload.reference_image_urls.every(
        (url: unknown) => typeof url === "string"
      ))
  ) {
    return jsonResponse(400, {
      error: "reference_image_urls must be an array of strings",
    });
  }

  if (!payload.contact_name?.trim()) {
    return jsonResponse(400, { error: "Contact name is required" });
  }

  if (!["email", "kakao", "phone"].includes(payload.contact_method)) {
    return jsonResponse(400, { error: "Invalid contact method" });
  }

  if (!payload.contact_value?.trim()) {
    return jsonResponse(400, { error: "Contact value is required" });
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

  const { data: result, error: rpcError } = await supabase.rpc(
    "create_quote_request_txn",
    {
      p_shipping_address_id: payload.shipping_address_id,
      p_options: payload.options,
      p_quantity: payload.quantity,
      p_reference_image_urls: payload.reference_image_urls ?? [],
      p_additional_notes: payload.additional_notes ?? "",
      p_contact_name: payload.contact_name,
      p_contact_title: payload.contact_title ?? "",
      p_contact_method: payload.contact_method,
      p_contact_value: payload.contact_value,
    }
  );

  if (rpcError || !result) {
    const status = rpcError?.code === "P0001" ? 400 : 500;
    return jsonResponse(status, {
      error: rpcError?.message ?? "Failed to create quote request",
    });
  }

  return jsonResponse(200, result);
});
