import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type AppName = "store" | "admin";

type AuthMeta = {
  appName: AppName;
  baseURL: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  email?: string;
};

type E2EFixtures = {
  storeProduct: {
    id: number;
    name: string;
    price: number;
  };
  shippingAddress: {
    id: string;
    recipientName: string;
  };
  coupon: {
    id: string;
    name: string;
    discountValue: number;
  };
};

export type CreateOrderResult = {
  payment_group_id: string;
  total_amount: number;
  orders: Array<{
    order_id: string;
    order_type: string;
    order_number: string;
  }>;
};

type SeededClaimOrder = {
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

const buildHeaders = (apiKey: string, accessToken: string) => ({
  apikey: apiKey,
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

let supabaseConfigCache: {
  supabaseUrl: string;
  supabaseAnonKey: string;
} | null = null;

const getSupabaseConfig = async () => {
  if (supabaseConfigCache) return supabaseConfigCache;
  const [storeEnv, adminEnv] = await Promise.all([
    fs
      .readFile(path.resolve(__dirname, "../../apps/store/.env"), "utf8")
      .catch(() => ""),
    fs
      .readFile(path.resolve(__dirname, "../../apps/admin/.env"), "utf8")
      .catch(() => ""),
  ]);

  const merged = [storeEnv, adminEnv].join("\n");
  const entries = Object.fromEntries(
    merged
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );

  supabaseConfigCache = {
    supabaseUrl:
      process.env.SUPABASE_URL ??
      process.env.VITE_SUPABASE_URL ??
      entries.VITE_SUPABASE_URL,
    supabaseAnonKey:
      process.env.SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY ??
      entries.VITE_SUPABASE_ANON_KEY,
  };
  return supabaseConfigCache;
};

const supabaseRequest = async <T>({
  path: requestPath,
  method = "GET",
  accessToken,
  body,
}: {
  path: string;
  method?: string;
  accessToken: string;
  body?: unknown;
}) => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env for E2E helper.");
  }

  const response = await fetch(`${supabaseUrl}${requestPath}`, {
    method,
    headers: buildHeaders(supabaseAnonKey, accessToken),
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
        path: "/rest/v1/products?select=id,name,price&stock=gt.0&order=id.asc&limit=1",
        accessToken: storeMeta.accessToken,
      }),
      supabaseRequest<Array<{ id: string; recipient_name: string }>>({
        path: `/rest/v1/shipping_addresses?select=id,recipient_name&user_id=eq.${storeMeta.userId}&order=created_at.desc&limit=1`,
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
    if (!products[0] || !shippingAddresses[0] || !coupon) {
      throw new Error("E2E fixtures are missing and could not be recovered.");
    }

    return {
      storeProduct: products[0],
      shippingAddress: {
        id: shippingAddresses[0].id,
        recipientName: shippingAddresses[0].recipient_name,
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
  quantity = 1,
}: {
  shippingAddressId: string;
  productId: number;
  productName: string;
  quantity?: number;
}) => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
  const storeMeta = await readAuthMeta("store");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env for E2E helper.");
  }

  const itemId = `e2e-claim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await fetch(`${supabaseUrl}/functions/v1/create-order`, {
    method: "POST",
    headers: buildHeaders(supabaseAnonKey, storeMeta.accessToken),
    body: JSON.stringify({
      shipping_address_id: shippingAddressId,
      items: [
        {
          item_id: itemId,
          item_type: "product",
          product_id: productId,
          selected_option_id: null,
          reform_data: null,
          quantity,
          applied_user_coupon_id: null,
        },
      ],
    }),
  });

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

export const seedSaleOrder = async ({
  delivered = false,
}: {
  delivered?: boolean;
} = {}): Promise<SeededClaimOrder> => {
  const fixtures = await readFixtures();
  const storeMeta = await readAuthMeta("store");
  const products = await supabaseRequest<
    Array<{ id: number; name: string; stock: number }>
  >({
    path: "/rest/v1/products?select=id,name,stock&stock=gt.0&order=id.asc&limit=20",
    accessToken: storeMeta.accessToken,
  });
  const product =
    products.find(
      (candidate) =>
        candidate.id !== fixtures.storeProduct.id && candidate.stock > 0,
    ) ?? products.find((candidate) => candidate.stock > 0);

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

const adminUpdateOrderStatus = async (
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

const progressOrderToDelivered = async (orderId: string) => {
  await adminUpdateOrderStatus(orderId, "진행중");
  await adminUpdateOrderStatus(orderId, "배송중");
  await adminUpdateOrderStatus(orderId, "배송완료");
};

export const seedClaimOrders = async (): Promise<{
  cancelOrder: SeededClaimOrder;
  returnOrder: SeededClaimOrder;
  exchangeOrder: SeededClaimOrder;
}> => {
  const fixtures = await readFixtures();
  const storeMeta = await readAuthMeta("store");
  const products = await supabaseRequest<
    Array<{ id: number; name: string; stock: number }>
  >({
    path: "/rest/v1/products?select=id,name,stock&stock=gt.0&order=id.asc&limit=20",
    accessToken: storeMeta.accessToken,
  });
  const claimProducts = products.filter(
    (product) => product.id !== fixtures.storeProduct.id,
  );

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
