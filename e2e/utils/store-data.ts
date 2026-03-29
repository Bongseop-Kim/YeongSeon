import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppName, AuthMeta, E2EFixtures } from "@/utils/auth-support";
import { buildHeaders } from "@/utils/auth-support";

export type CreateOrderResult = {
  payment_group_id: string;
  total_amount: number;
  orders: Array<{
    order_id: string;
    order_type: string;
    order_number: string;
  }>;
};

export type SeededClaimOrder = {
  orderId: string;
  orderNumber: string;
  itemId: string;
  status: string;
  productName: string;
};

type CreateClaimResult = {
  claim_id: string;
  claim_number: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.resolve(__dirname, "..", ".auth");

const readJsonFile = async <T>(fileName: string) => {
  const raw = await fs.readFile(path.join(authDir, fileName), "utf8");
  return JSON.parse(raw) as T;
};

export const readAuthMeta = (appName: AppName) =>
  readJsonFile<AuthMeta>(`${appName}.meta.json`);

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetriableFetchError = (error: unknown) => {
  if (!(error instanceof Error)) return false;

  const cause = error.cause as { code?: string } | undefined;
  return (
    error.message.includes("fetch failed") &&
    (cause?.code === "ETIMEDOUT" ||
      cause?.code === "ECONNRESET" ||
      cause?.code === "UND_ERR_CONNECT_TIMEOUT")
  );
};

const fetchWithRetry = async (
  input: string,
  init: RequestInit,
  retries = 4,
): Promise<Response> => {
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(input, init);

      if (
        response.status !== 408 &&
        response.status !== 429 &&
        response.status < 500
      ) {
        return response;
      }

      if (attempt >= retries) {
        return response;
      }
    } catch (error) {
      if (!isRetriableFetchError(error) || attempt >= retries) {
        throw error;
      }
    }

    attempt += 1;
    await sleep(750 * attempt);
  }
};

let supabaseConfigCache: {
  supabaseUrl: string;
  supabaseAnonKey: string;
} | null = null;

export const getSupabaseConfig = async () => {
  if (supabaseConfigCache) return supabaseConfigCache;
  let entries: Record<string, string> = {};

  const envSupabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const envSupabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!envSupabaseUrl || !envSupabaseAnonKey) {
    const readEnvFile = async (filePath: string) => {
      try {
        return await fs.readFile(filePath, "utf8");
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;

        if (nodeError.code === "ENOENT") {
          return "";
        }

        throw error;
      }
    };

    const [storeEnv, adminEnv] = await Promise.all([
      readEnvFile(path.resolve(__dirname, "../../apps/store/.env")),
      readEnvFile(path.resolve(__dirname, "../../apps/admin/.env")),
    ]);

    const merged = [storeEnv, adminEnv].join("\n");
    entries = Object.fromEntries(
      merged
        .split(/\r?\n/)
        .filter(Boolean)
        .filter((line) => !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        }),
    );
  }

  const supabaseUrl = envSupabaseUrl ?? entries.VITE_SUPABASE_URL;
  const supabaseAnonKey = envSupabaseAnonKey ?? entries.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env for E2E helper.");
  }

  supabaseConfigCache = {
    supabaseUrl,
    supabaseAnonKey,
  };
  return supabaseConfigCache;
};

export const supabaseRequest = async <T>({
  path: requestPath,
  method = "GET",
  accessToken,
  body,
  preferRepresentation = false,
}: {
  path: string;
  method?: string;
  accessToken: string;
  body?: unknown;
  preferRepresentation?: boolean;
}) => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env for E2E helper.");
  }

  const response = await fetchWithRetry(`${supabaseUrl}${requestPath}`, {
    method,
    headers: {
      ...buildHeaders(supabaseAnonKey, accessToken),
      ...(preferRepresentation ? { Prefer: "return=representation" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase request failed: ${method} ${requestPath} ${response.status} ${await response.text()}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};

export const readFixtures = async (): Promise<E2EFixtures> => {
  try {
    return await readJsonFile<E2EFixtures>("fixtures.json");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== "ENOENT") {
      throw error;
    }

    const storeMeta = await readAuthMeta("store");
    const [products, shippingAddresses, userCoupons] = await Promise.all([
      supabaseRequest<Array<{ id: number; name: string; price: number }>>({
        path: "/rest/v1/products?select=id,name,price&stock=gt.0&option_label=is.null&order=id.asc&limit=1",
        accessToken: storeMeta.accessToken,
      }),
      supabaseRequest<
        Array<{ id: string; recipient_name: string; is_default: boolean }>
      >({
        path: `/rest/v1/shipping_addresses?select=id,recipient_name,is_default&user_id=eq.${storeMeta.userId}&order=created_at.desc`,
        accessToken: storeMeta.accessToken,
      }),
      supabaseRequest<
        Array<{
          coupon: { id: string; name: string; discount_value: number } | null;
        }>
      >({
        path: `/rest/v1/user_coupons?select=coupon:coupons(id,name,discount_value)&user_id=eq.${storeMeta.userId}&status=eq.active&limit=1`,
        accessToken: storeMeta.accessToken,
      }),
    ]);

    const coupon = userCoupons[0]?.coupon;
    const shippingAddress =
      shippingAddresses.find((address) => address.is_default) ??
      shippingAddresses[0];

    if (!products[0] || !shippingAddress || !coupon) {
      throw new Error("E2E fixtures are missing and could not be recovered.");
    }

    return {
      storeProduct: products[0],
      shippingAddress: {
        id: shippingAddress.id,
        recipientName: shippingAddress.recipient_name,
      },
      coupon: {
        id: coupon.id,
        name: coupon.name,
        discountValue: coupon.discount_value,
      },
    };
  }
};

export const resetStoreCart = async () => {
  const storeMeta = await readAuthMeta("store");

  await supabaseRequest({
    path: "/rest/v1/rpc/replace_cart_items",
    method: "POST",
    accessToken: storeMeta.accessToken,
    body: {
      p_user_id: storeMeta.userId,
      p_items: [],
    },
  });
};

const createStoreOrder = async ({
  shippingAddressId,
  productId,
  productName,
  selectedOptionId,
  quantity = 1,
}: {
  shippingAddressId: string;
  productId: number;
  productName: string;
  selectedOptionId?: number | null;
  quantity?: number;
}) => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
  const storeMeta = await readAuthMeta("store");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env for E2E helper.");
  }

  if (selectedOptionId == null) {
    const productDetails = await supabaseRequest<
      Array<{ id: number; option_label: string | null }>
    >({
      path: `/rest/v1/products?select=id,option_label&id=eq.${productId}&limit=1`,
      accessToken: storeMeta.accessToken,
    });
    const product = productDetails[0];

    if (!product) {
      throw new Error(`Product ${productId} could not be loaded for E2E seed.`);
    }

    if (product.option_label !== null) {
      throw new Error(
        `Product ${productId} requires an option selection, but selectedOptionId was not provided.`,
      );
    }
  }

  const itemId = `e2e-claim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await fetchWithRetry(
    `${supabaseUrl}/functions/v1/create-order`,
    {
      method: "POST",
      headers: buildHeaders(supabaseAnonKey, storeMeta.accessToken),
      body: JSON.stringify({
        shipping_address_id: shippingAddressId,
        items: [
          {
            item_id: itemId,
            item_type: "product",
            product_id: productId,
            selected_option_id: selectedOptionId ?? null,
            reform_data: null,
            quantity,
            applied_user_coupon_id: null,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `create-order failed: ${response.status} ${await response.text()}`,
    );
  }

  const result = (await response.json()) as CreateOrderResult;
  const createdOrder = result.orders[0];

  if (!createdOrder) {
    throw new Error("create-order did not return any orders.");
  }

  const orderItems = await supabaseRequest<Array<{ id: string }>>({
    path: `/rest/v1/order_item_view?select=id&order_id=eq.${createdOrder.order_id}`,
    accessToken: storeMeta.accessToken,
  });
  const createdItem = orderItems[0];

  if (!createdItem) {
    throw new Error("Seeded order item could not be loaded.");
  }

  return {
    orderId: createdOrder.order_id,
    orderNumber: createdOrder.order_number,
    itemId: createdItem.id,
    status: "대기중",
    productName,
  } satisfies SeededClaimOrder;
};

const listSeedableProducts = async (
  accessToken: string,
): Promise<Array<{ id: number; name: string; stock: number }>> => {
  const products = await supabaseRequest<
    Array<{
      id: number;
      name: string;
      stock: number;
      option_label: string | null;
    }>
  >({
    path: "/rest/v1/products?select=id,name,stock,option_label&stock=gt.0&order=id.asc&limit=50",
    accessToken,
  });

  return products
    .filter((product) => product.stock > 0 && product.option_label === null)
    .map(({ id, name, stock }) => ({ id, name, stock }));
};

export const seedSaleOrder = async ({
  delivered = false,
}: {
  delivered?: boolean;
} = {}): Promise<SeededClaimOrder> => {
  const fixtures = await readFixtures();
  const storeMeta = await readAuthMeta("store");
  const products = await listSeedableProducts(storeMeta.accessToken);
  const product = products.find(
    (candidate) =>
      candidate.id !== fixtures.storeProduct.id && candidate.stock > 0,
  ) ??
    products.find((candidate) => candidate.stock > 0) ?? {
      id: fixtures.storeProduct.id,
      name: fixtures.storeProduct.name,
      stock: 1,
    };

  if (!product) {
    throw new Error("No sale product with stock available for E2E seed.");
  }

  const order = await createStoreOrder({
    shippingAddressId: fixtures.shippingAddress.id,
    productId: product.id,
    productName: product.name,
  });

  if (delivered) {
    await progressOrderToDelivered(order.orderId);
    order.status = "배송완료";
  }

  return order;
};

export const createStoreClaim = async ({
  type,
  orderId,
  itemId,
  reason,
  description,
  quantity = 1,
}: {
  type: "cancel" | "return" | "exchange";
  orderId: string;
  itemId: string;
  reason:
    | "change_mind"
    | "defect"
    | "delay"
    | "wrong_item"
    | "size_mismatch"
    | "color_mismatch"
    | "other";
  description?: string;
  quantity?: number;
}) => {
  const storeMeta = await readAuthMeta("store");

  const result = await supabaseRequest<CreateClaimResult>({
    path: "/rest/v1/rpc/create_claim",
    method: "POST",
    accessToken: storeMeta.accessToken,
    body: {
      p_type: type,
      p_order_id: orderId,
      p_item_id: itemId,
      p_reason: reason,
      p_description: description ?? null,
      p_quantity: quantity,
    },
  });

  return {
    claimId: result.claim_id,
    claimNumber: result.claim_number,
  };
};

export const adminUpdateOrderStatus = async (
  orderId: string,
  newStatus: string,
  memo?: string | null,
  isRollback = false,
) => {
  const adminMeta = await readAuthMeta("admin");

  await supabaseRequest({
    path: "/rest/v1/rpc/admin_update_order_status",
    method: "POST",
    accessToken: adminMeta.accessToken,
    body: {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_memo: memo ?? null,
      p_is_rollback: isRollback,
    },
  });
};

export const adminRollbackOrderStatus = async ({
  orderId,
  targetStatus,
  memo,
}: {
  orderId: string;
  targetStatus: string;
  memo?: string | null;
}) => {
  return adminUpdateOrderStatus(orderId, targetStatus, memo, true);
};

const progressOrderToShipping = async (orderId: string) => {
  await adminUpdateOrderStatus(orderId, "진행중");
  await adminUpdateOrderStatus(orderId, "배송중");
};

const progressOrderToDelivered = async (orderId: string) => {
  await progressOrderToShipping(orderId);
  await adminUpdateOrderStatus(orderId, "배송완료");
};

export const seedShippingOrder = async (): Promise<SeededClaimOrder> => {
  const order = await seedSaleOrder();
  await progressOrderToShipping(order.orderId);
  order.status = "배송중";
  return order;
};

export const seedClaimOrders = async (): Promise<{
  cancelOrder: SeededClaimOrder;
  returnOrder: SeededClaimOrder;
  exchangeOrder: SeededClaimOrder;
}> => {
  const fixtures = await readFixtures();
  const storeMeta = await readAuthMeta("store");
  const products = await listSeedableProducts(storeMeta.accessToken);
  const claimProducts = [
    ...products.filter((product) => product.id !== fixtures.storeProduct.id),
    ...products.filter((product) => product.id === fixtures.storeProduct.id),
  ];

  const selectedProducts: Array<{ id: number; name: string }> = [];
  for (const product of claimProducts) {
    const count = Math.min(product.stock, 3 - selectedProducts.length);
    for (let i = 0; i < count; i++) {
      selectedProducts.push({ id: product.id, name: product.name });
    }
    if (selectedProducts.length === 3) break;
  }

  if (selectedProducts.length < 3) {
    throw new Error(
      "Unable to secure enough product stock for claim E2E seed orders.",
    );
  }

  const cancelOrder = await createStoreOrder({
    shippingAddressId: fixtures.shippingAddress.id,
    productId: selectedProducts[0].id,
    productName: selectedProducts[0].name,
  });

  const [returnOrder, exchangeOrder] = await Promise.all([
    createStoreOrder({
      shippingAddressId: fixtures.shippingAddress.id,
      productId: selectedProducts[1].id,
      productName: selectedProducts[1].name,
    }).then(async (order) => {
      await progressOrderToDelivered(order.orderId);
      order.status = "배송완료";
      return order;
    }),
    createStoreOrder({
      shippingAddressId: fixtures.shippingAddress.id,
      productId: selectedProducts[2].id,
      productName: selectedProducts[2].name,
    }).then(async (order) => {
      await progressOrderToDelivered(order.orderId);
      order.status = "배송완료";
      return order;
    }),
  ]);

  return {
    cancelOrder,
    returnOrder,
    exchangeOrder,
  };
};

export type ClaimAdminSeed = {
  claimId: string;
  claimNumber: string;
  orderId: string;
  orderNumber: string;
};

export const seedClaimForAdminFlow = async (
  type: "cancel" | "return" | "exchange",
): Promise<ClaimAdminSeed> => {
  const needsDelivered = type === "return" || type === "exchange";
  const order = await seedSaleOrder({ delivered: needsDelivered });

  const claim = await createStoreClaim({
    type,
    orderId: order.orderId,
    itemId: order.itemId,
    reason: type === "cancel" ? "change_mind" : "defect",
    description: `E2E admin ${type} claim`,
  });

  return {
    claimId: claim.claimId,
    claimNumber: claim.claimNumber,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
  };
};

export const seedRepairOrder = async (): Promise<SeededClaimOrder> => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
  const storeMeta = await readAuthMeta("store");
  const fixtures = await readFixtures();

  const tieId = `e2e-tie-${Date.now()}`;
  const itemId = `reform-${tieId}-${Math.random().toString(36).slice(2)}`;

  const response = await fetchWithRetry(
    `${supabaseUrl}/functions/v1/create-order`,
    {
      method: "POST",
      headers: buildHeaders(supabaseAnonKey, storeMeta.accessToken),
      body: JSON.stringify({
        shipping_address_id: fixtures.shippingAddress.id,
        items: [
          {
            item_id: itemId,
            item_type: "reform",
            product_id: null,
            selected_option_id: null,
            reform_data: {
              tie: { id: tieId, measurementType: "length", tieLength: 150 },
              cost: 15000,
            },
            quantity: 1,
            applied_user_coupon_id: null,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `create-order (repair) failed: ${response.status} ${await response.text()}`,
    );
  }

  const result = (await response.json()) as CreateOrderResult;
  const repairOrder = result.orders.find((o) => o.order_type === "repair");

  if (!repairOrder) {
    throw new Error("Repair order not created by create-order.");
  }

  const orderItems = await supabaseRequest<Array<{ id: string }>>({
    path: `/rest/v1/order_item_view?select=id&order_id=eq.${repairOrder.order_id}`,
    accessToken: storeMeta.accessToken,
  });
  const fetchedItemId = orderItems[0]?.id;

  if (!fetchedItemId) {
    throw new Error(
      `Repair order item id not found for order ${repairOrder.order_id} (query: order_item_view?order_id=eq.${repairOrder.order_id})`,
    );
  }

  return {
    orderId: repairOrder.order_id,
    orderNumber: repairOrder.order_number,
    itemId: fetchedItemId,
    status: "대기중",
    productName: "수선 주문",
  };
};

export const seedRepairOrderInStatus = async (
  status: "접수" | "수선중" | "배송중",
): Promise<SeededClaimOrder> => {
  const storeMeta = await readAuthMeta("store");
  const fixtures = await readFixtures();

  const orderNumber = `E2E-REPAIR-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
  const tieId = `seed-tie-${Date.now()}`;
  const itemId = `reform-${tieId}-${Math.random().toString(36).slice(2)}`;
  const trackingNumber = `E2E-${Date.now()}`;
  const shippedStatuses = new Set(["수선중", "배송중"]);

  const insertedOrders = await supabaseRequest<
    Array<{ id: string; order_number: string }>
  >({
    path: "/rest/v1/orders?select=id,order_number",
    method: "POST",
    accessToken: storeMeta.accessToken,
    preferRepresentation: true,
    body: {
      user_id: storeMeta.userId,
      order_number: orderNumber,
      shipping_address_id: fixtures.shippingAddress.id,
      total_price: 18000,
      original_price: 18000,
      total_discount: 0,
      order_type: "repair",
      status,
      shipping_cost: 3000,
      payment_group_id: crypto.randomUUID(),
      ...(shippedStatuses.has(status)
        ? {
            courier_company: "cj",
            tracking_number: trackingNumber,
            shipped_at: new Date().toISOString(),
          }
        : {}),
    },
  });

  const order = insertedOrders[0];
  if (!order) {
    throw new Error(
      `Failed to insert seeded repair order with status ${status}.`,
    );
  }

  await supabaseRequest({
    path: "/rest/v1/order_items",
    method: "POST",
    accessToken: storeMeta.accessToken,
    body: {
      order_id: order.id,
      item_id: itemId,
      item_type: "reform",
      item_data: {
        tie: { id: tieId, measurementType: "length", tieLength: 150 },
        cost: 15000,
      },
      quantity: 1,
      unit_price: 15000,
      discount_amount: 0,
      line_discount_amount: 0,
    },
  });

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    itemId,
    status,
    productName: "수선 주문",
  };
};

export const submitRepairTrackingForStore = async (
  orderId: string,
  courierCompany = "cj",
  trackingNumber = `E2E-${Date.now()}`,
) => {
  const storeMeta = await readAuthMeta("store");

  await supabaseRequest({
    path: "/rest/v1/rpc/submit_repair_tracking",
    method: "POST",
    accessToken: storeMeta.accessToken,
    body: {
      p_order_id: orderId,
      p_courier_company: courierCompany,
      p_tracking_number: trackingNumber,
    },
  });
};

export const seedCustomOrder = async (opts?: {
  sample?: boolean;
  sampleType?: string | null;
}): Promise<SeededClaimOrder> => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
  const storeMeta = await readAuthMeta("store");
  const fixtures = await readFixtures();

  const sample = opts?.sample ?? false;
  const sampleType = opts?.sampleType ?? null;

  const response = await fetchWithRetry(
    `${supabaseUrl}/functions/v1/create-custom-order`,
    {
      method: "POST",
      headers: buildHeaders(supabaseAnonKey, storeMeta.accessToken),
      body: JSON.stringify({
        shipping_address_id: fixtures.shippingAddress.id,
        options: {
          fabric_provided: false,
          reorder: false,
          fabric_type: "POLY",
          design_type: "PRINTING",
          tie_type: "AUTO",
          interlining: null,
          interlining_thickness: "THICK",
          size_type: "ADULT",
          tie_width: 8,
          triangle_stitch: true,
          side_stitch: true,
          bar_tack: false,
          fold7: false,
          dimple: false,
          spoderato: false,
          brand_label: false,
          care_label: false,
        },
        quantity: 4,
        sample,
        sample_type: sampleType,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `create-custom-order failed: ${response.status} ${await response.text()}`,
    );
  }

  const result = (await response.json()) as {
    order_id: string;
    order_number: string;
  };

  const orderItems = await supabaseRequest<Array<{ id: string }>>({
    path: `/rest/v1/order_item_view?select=id&order_id=eq.${result.order_id}`,
    accessToken: storeMeta.accessToken,
  });
  const itemId = orderItems[0]?.id;

  if (!itemId) {
    throw new Error(
      `Custom order item id not found for order ${result.order_id} (query: order_item_view?order_id=eq.${result.order_id})`,
    );
  }

  return {
    orderId: result.order_id,
    orderNumber: result.order_number,
    itemId,
    status: "대기중",
    productName: "주문 제작",
  };
};

export const adminUpdateClaimStatus = async (
  claimId: string,
  newStatus: string,
  memo?: string | null,
  isRollback = false,
) => {
  const adminMeta = await readAuthMeta("admin");

  await supabaseRequest({
    path: "/rest/v1/rpc/admin_update_claim_status",
    method: "POST",
    accessToken: adminMeta.accessToken,
    body: {
      p_claim_id: claimId,
      p_new_status: newStatus,
      p_memo: memo ?? null,
      p_is_rollback: isRollback,
    },
  });
};
