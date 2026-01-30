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

type CouponRecord = {
  id: string;
  status: string;
  expires_at: string | null;
  coupon: {
    discount_type: "percentage" | "fixed";
    discount_value: number | string;
    max_discount_amount: number | string | null;
    expiry_date: string | null;
    is_active: boolean | null;
  } | null;
};

type OrderItemInsert = {
  order_id: string;
  item_id: string;
  item_type: "product" | "reform";
  product_id: number | null;
  selected_option_id: string | null;
  reform_data: OrderItemInput["reform_data"];
  quantity: number;
  unit_price: number;
  discount_amount: number;
  applied_user_coupon_id: string | null;
};
const REFORM_BASE_COST = 15000;
const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
const isExpired = (dateValue?: string | null) => {
  if (!dateValue) return false;
  const now = new Date();
  const date = new Date(dateValue);
  return date.getTime() < now.getTime();
};
const calculateDiscount = (price: number, coupon: CouponRecord["coupon"]) => {
  if (!coupon || !coupon.is_active) return 0;
  if (isExpired(coupon.expiry_date)) return 0;
  const discountValue = Number(coupon.discount_value);
  const maxDiscountAmount =
    coupon.max_discount_amount != null
      ? Number(coupon.max_discount_amount)
      : null;
  if (coupon.discount_type === "percentage") {
    const discountAmount = Math.floor(price * (discountValue / 100));
    const cappedAmount =
      maxDiscountAmount != null
        ? Math.min(discountAmount, maxDiscountAmount)
        : discountAmount;
    return Math.min(cappedAmount, price);
  }
  const cappedAmount =
    maxDiscountAmount != null
      ? Math.min(discountValue, maxDiscountAmount)
      : discountValue;
  return Math.min(cappedAmount, price);
};
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed",
    });
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, {
      error: "Unauthorized",
    });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(500, {
      error: "Missing Supabase configuration",
    });
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
    return jsonResponse(401, {
      error: "Unauthorized",
    });
  }
  let payload: CreateOrderInput;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, {
      error: "Invalid JSON body",
    });
  }
  if (!payload?.shipping_address_id || !Array.isArray(payload.items)) {
    return jsonResponse(400, {
      error: "Invalid request payload",
    });
  }
  if (payload.items.length === 0) {
    return jsonResponse(400, {
      error: "Order items are required",
    });
  }
  const { data: shippingAddress, error: shippingError } = await supabase
    .from("shipping_addresses")
    .select("id")
    .eq("id", payload.shipping_address_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (shippingError) {
    return jsonResponse(500, {
      error: "Failed to load shipping address",
    });
  }
  if (!shippingAddress) {
    return jsonResponse(403, {
      error: "Shipping address not found",
    });
  }
  const productItems = payload.items.filter(
    (item) => item.item_type === "product"
  );
  const productIds = Array.from(
    new Set(productItems.map((item) => item.product_id).filter(Boolean))
  );
  const optionIds = Array.from(
    new Set(productItems.map((item) => item.selected_option_id).filter(Boolean))
  );
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, price")
    .in("id", productIds.length > 0 ? productIds : [0]);
  if (productError) {
    return jsonResponse(500, {
      error: "Failed to load products",
    });
  }
  const productPriceById = new Map();
  (products ?? []).forEach((product) => {
    productPriceById.set(product.id, product.price);
  });
  const { data: options, error: optionError } = await supabase
    .from("product_options")
    .select("product_id, option_id, additional_price")
    .in("product_id", productIds.length > 0 ? productIds : [0])
    .in("option_id", optionIds.length > 0 ? optionIds : [""]);
  if (optionError) {
    return jsonResponse(500, {
      error: "Failed to load product options",
    });
  }
  const optionPriceByKey = new Map();
  (options ?? []).forEach((option) => {
    optionPriceByKey.set(
      `${option.product_id}:${option.option_id}`,
      option.additional_price ?? 0
    );
  });
  const appliedCouponIds = Array.from(
    new Set(
      payload.items.map((item) => item.applied_user_coupon_id).filter(Boolean)
    )
  );
  const { data: coupons, error: couponError } = await supabase
    .from("user_coupons")
    .select(
      "id, status, expires_at, coupon:coupons(discount_type, discount_value, max_discount_amount, expiry_date, is_active)"
    )
    .eq("user_id", user.id)
    .in("id", appliedCouponIds.length > 0 ? appliedCouponIds : [""]);
  if (couponError) {
    return jsonResponse(500, {
      error: "Failed to load coupons",
    });
  }
  const couponById = new Map<string, CouponRecord>();
  (coupons ?? []).forEach((coupon) => {
    couponById.set(coupon.id, coupon as unknown as CouponRecord);
  });
  let originalPrice = 0;
  let totalDiscount = 0;
  let orderItemsPayload: OrderItemInsert[] = [];
  try {
    orderItemsPayload = payload.items.map((item) => {
      if (!item.item_id || !item.quantity || item.quantity <= 0) {
        throw new Error("Invalid item quantity");
      }
      let unitPrice = 0;
      if (item.item_type === "product") {
        if (!item.product_id) {
          throw new Error("Product id is required");
        }
        const basePrice = productPriceById.get(item.product_id);
        if (basePrice == null) {
          throw new Error("Product not found");
        }
        let optionPrice = 0;
        if (item.selected_option_id) {
          const key = `${item.product_id}:${item.selected_option_id}`;
          const additional = optionPriceByKey.get(key);
          if (additional == null) {
            throw new Error("Selected option not found");
          }
          optionPrice = additional;
        }
        unitPrice = basePrice + optionPrice;
      } else {
        if (!item.reform_data) {
          throw new Error("Reform data is required");
        }
        unitPrice = REFORM_BASE_COST;
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error("Invalid unit price");
      }
      let discount = 0;
      if (item.applied_user_coupon_id) {
        const couponRecord = couponById.get(item.applied_user_coupon_id);
        if (!couponRecord || couponRecord.status !== "active") {
          throw new Error("Coupon is not available");
        }
        if (isExpired(couponRecord.expires_at)) {
          throw new Error("Coupon has expired");
        }
        discount = calculateDiscount(unitPrice, couponRecord.coupon);
      }
      const itemOriginalPrice = unitPrice * item.quantity;
      originalPrice += itemOriginalPrice;
      totalDiscount += discount * item.quantity;
      return {
        order_id: "",
        item_id: item.item_id,
        item_type: item.item_type,
        product_id: item.product_id,
        selected_option_id: item.selected_option_id,
        reform_data: item.reform_data
          ? {
              ...item.reform_data,
              cost: REFORM_BASE_COST,
            }
          : null,
        quantity: item.quantity,
        unit_price: unitPrice,
        discount_amount: discount,
        applied_user_coupon_id: item.applied_user_coupon_id,
      };
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
  const totalPrice = originalPrice - totalDiscount;
  const { data: orderResult, error: orderError } = await supabase.rpc(
    "create_order_txn",
    {
      p_shipping_address_id: payload.shipping_address_id,
      p_items: orderItemsPayload,
      p_original_price: originalPrice,
      p_total_discount: totalDiscount,
      p_total_price: totalPrice,
    }
  );
  if (orderError || !orderResult) {
    return jsonResponse(500, {
      error: "Failed to create order",
    });
  }
  return jsonResponse(200, orderResult);
});
