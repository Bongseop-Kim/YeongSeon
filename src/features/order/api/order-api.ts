import { supabase } from "@/lib/supabase";
import type { CreateOrderRequest, CreateOrderResponse } from "./order-mapper";
import { mapOrderItemToRecord, mapRecordToOrderItem } from "./order-mapper";
import { calculateDiscount } from "../utils/calculate-discount";
import type { Order } from "../types/order-item";
import type { OrderRecord, OrderItemRecord } from "../types/order-record";
import type { Product, ProductOption } from "@/features/shop/types/product";
import type {
  ProductRecord,
  ProductOptionRecord,
} from "@/features/shop/types/product-record";
import {
  checkLikedProducts,
  getLikeCounts,
} from "@/features/shop/api/likes-api";
import { getUserCouponsByIds } from "@/features/order/api/coupons-api";
import type { AppliedCoupon } from "@/features/order/types/coupon";

const ORDERS_TABLE_NAME = "orders";
const ORDER_ITEMS_TABLE_NAME = "order_items";
const PRODUCT_TABLE_NAME = "products";
const PRODUCT_OPTIONS_TABLE_NAME = "product_options";

/**
 * 주문 생성
 */
export const createOrder = async (
  request: CreateOrderRequest
): Promise<CreateOrderResponse> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  const userId = session.user.id;

  // 주문 번호 생성
  const { data: orderNumberData, error: orderNumberError } = await supabase.rpc(
    "generate_order_number"
  );

  if (orderNumberError) {
    throw new Error(`주문 번호 생성 실패: ${orderNumberError.message}`);
  }

  const orderNumber = orderNumberData as string;

  // 주문 생성
  const { data: orderData, error: orderError } = await supabase
    .from(ORDERS_TABLE_NAME)
    .insert({
      user_id: userId,
      order_number: orderNumber,
      shipping_address_id: request.shippingAddressId,
      total_price: request.totals.totalPrice,
      original_price: request.totals.originalPrice,
      total_discount: request.totals.totalDiscount,
      status: "대기중",
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(`주문 생성 실패: ${orderError.message}`);
  }

  const orderId = orderData.id;

  // 주문 아이템 생성
  const orderItemRecords = request.items.map((item) => {
    const unitPrice =
      item.type === "product"
        ? item.product.price + (item.selectedOption?.additionalPrice ?? 0)
        : item.reformData.cost;

    const discountAmount = calculateDiscount(unitPrice, item.appliedCoupon);

    return mapOrderItemToRecord(item, orderId, unitPrice, discountAmount);
  });

  const { error: orderItemsError } = await supabase
    .from(ORDER_ITEMS_TABLE_NAME)
    .insert(orderItemRecords);

  if (orderItemsError) {
    // 주문 아이템 생성 실패 시 주문도 롤백
    await supabase.from(ORDERS_TABLE_NAME).delete().eq("id", orderId);
    throw new Error(`주문 아이템 생성 실패: ${orderItemsError.message}`);
  }

  // 사용된 쿠폰 상태 업데이트
  const usedCouponIds = request.items
    .filter((item) => item.appliedCoupon?.id)
    .map((item) => item.appliedCoupon!.id);

  if (usedCouponIds.length > 0) {
    const { error: couponUpdateError } = await supabase
      .from("user_coupons")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
      })
      .in("id", usedCouponIds);

    if (couponUpdateError) {
      console.warn("쿠폰 상태 업데이트 실패:", couponUpdateError.message);
      // 쿠폰 업데이트 실패는 주문 생성 실패로 처리하지 않음 (경고만)
    }
  }

  return {
    orderId,
    orderNumber,
  };
};

/**
 * 상품 정보 조회 (주문 목록용)
 */
async function fetchProductsByIds(
  productIds: number[]
): Promise<Map<number, Product>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(PRODUCT_TABLE_NAME)
    .select("*")
    .in("id", productIds);

  if (error) {
    throw new Error(`주문 상품 정보를 불러올 수 없습니다: ${error.message}`);
  }

  const { data: optionsData, error: optionsError } = await supabase
    .from(PRODUCT_OPTIONS_TABLE_NAME)
    .select("*")
    .in("product_id", productIds);

  if (optionsError) {
    console.warn("상품 옵션 조회 실패:", optionsError.message);
  }

  const optionsByProductId = new Map<number, ProductOption[]>();
  optionsData?.forEach((opt: ProductOptionRecord) => {
    const option: ProductOption = {
      id: opt.option_id,
      name: opt.name,
      additionalPrice: opt.additional_price,
    };
    if (!optionsByProductId.has(opt.product_id)) {
      optionsByProductId.set(opt.product_id, []);
    }
    optionsByProductId.get(opt.product_id)!.push(option);
  });

  let likedProductIds = new Set<number>();
  let likeCounts = new Map<number, number>();
  try {
    likedProductIds = await checkLikedProducts(productIds);
  } catch (error) {
    console.warn("좋아요 상태 조회 실패:", error);
  }

  try {
    likeCounts = await getLikeCounts(productIds);
  } catch (error) {
    console.warn("좋아요 수 조회 실패:", error);
  }

  const productsById = new Map<number, Product>();
  data?.forEach((record: ProductRecord) => {
    const product: Product = {
      id: record.id,
      code: record.code,
      name: record.name,
      price: record.price,
      image: record.image,
      category: record.category,
      color: record.color,
      pattern: record.pattern,
      material: record.material,
      info: record.info,
      likes: likeCounts.get(record.id) || 0,
      isLiked: likedProductIds.has(record.id),
    };

    const options = optionsByProductId.get(record.id);
    if (options && options.length > 0) {
      product.options = options;
    }

    productsById.set(record.id, product);
  });

  return productsById;
}

/**
 * 주문에 적용된 쿠폰 조회
 */
async function fetchAppliedCoupons(
  couponIds: string[]
): Promise<Map<string, AppliedCoupon>> {
  if (couponIds.length === 0) {
    return new Map();
  }

  try {
    const coupons = await getUserCouponsByIds(couponIds, { activeOnly: false });
    return new Map(coupons.map((coupon) => [coupon.id, coupon]));
  } catch (error) {
    console.warn("주문 쿠폰 정보를 불러오지 못했습니다:", error);
    return new Map();
  }
}

/**
 * 주문 목록 조회
 */
export const getOrders = async (userId: string): Promise<Order[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  // 주문 목록 조회
  const { data: ordersData, error: ordersError } = await supabase
    .from(ORDERS_TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw new Error(`주문 목록 조회 실패: ${ordersError.message}`);
  }

  if (!ordersData || ordersData.length === 0) {
    return [];
  }

  const orderRecords = ordersData as OrderRecord[];
  const orderIds = orderRecords.map((order) => order.id);

  // 주문 아이템 조회
  const { data: orderItemsData, error: orderItemsError } = await supabase
    .from(ORDER_ITEMS_TABLE_NAME)
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (orderItemsError) {
    throw new Error(`주문 아이템 조회 실패: ${orderItemsError.message}`);
  }

  const orderItemRecords = (orderItemsData || []) as OrderItemRecord[];

  // 주문별 아이템 그룹화
  const itemsByOrderId = new Map<string, OrderItemRecord[]>();
  orderItemRecords.forEach((item) => {
    if (!itemsByOrderId.has(item.order_id)) {
      itemsByOrderId.set(item.order_id, []);
    }
    itemsByOrderId.get(item.order_id)!.push(item);
  });

  // 상품 ID 수집
  const productIds = Array.from(
    new Set(
      orderItemRecords
        .filter(
          (record) =>
            record.item_type === "product" && record.product_id != null
        )
        .map((record) => record.product_id as number)
    )
  );

  // 쿠폰 ID 수집
  const couponIds = Array.from(
    new Set(
      orderItemRecords
        .filter((record) => !!record.applied_user_coupon_id)
        .map((record) => record.applied_user_coupon_id as string)
    )
  );

  // 상품 및 쿠폰 정보 병렬 조회
  const [productsById, couponsById] = await Promise.all([
    fetchProductsByIds(productIds),
    fetchAppliedCoupons(couponIds),
  ]);

  // OrderRecord를 Order로 변환
  const orders: Order[] = orderRecords.map((orderRecord) => {
    const items = itemsByOrderId.get(orderRecord.id) || [];
    const orderItems = items.map((itemRecord) =>
      mapRecordToOrderItem(itemRecord, productsById, couponsById)
    );

    // OrderStatus 타입 매핑 (DB의 "취소"는 제외)
    const status: Order["status"] =
      orderRecord.status === "취소"
        ? "대기중"
        : (orderRecord.status as Order["status"]);

    return {
      id: orderRecord.id,
      orderNumber: orderRecord.order_number,
      date: orderRecord.created_at.split("T")[0], // YYYY-MM-DD 형식
      status,
      items: orderItems,
      totalPrice: orderRecord.total_price,
    };
  });

  return orders;
};

/**
 * 주문 상세 조회
 */
export const getOrder = async (
  userId: string,
  orderId: string
): Promise<Order | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  // 주문 조회
  const { data: orderData, error: orderError } = await supabase
    .from(ORDERS_TABLE_NAME)
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();

  if (orderError) {
    if (orderError.code === "PGRST116") {
      // 데이터 없음
      return null;
    }
    throw new Error(`주문 조회 실패: ${orderError.message}`);
  }

  const orderRecord = orderData as OrderRecord;

  // 주문 아이템 조회
  const { data: orderItemsData, error: orderItemsError } = await supabase
    .from(ORDER_ITEMS_TABLE_NAME)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (orderItemsError) {
    throw new Error(`주문 아이템 조회 실패: ${orderItemsError.message}`);
  }

  const orderItemRecords = (orderItemsData || []) as OrderItemRecord[];

  // 상품 ID 수집
  const productIds = Array.from(
    new Set(
      orderItemRecords
        .filter(
          (record) =>
            record.item_type === "product" && record.product_id != null
        )
        .map((record) => record.product_id as number)
    )
  );

  // 쿠폰 ID 수집
  const couponIds = Array.from(
    new Set(
      orderItemRecords
        .filter((record) => !!record.applied_user_coupon_id)
        .map((record) => record.applied_user_coupon_id as string)
    )
  );

  // 상품 및 쿠폰 정보 병렬 조회
  const [productsById, couponsById] = await Promise.all([
    fetchProductsByIds(productIds),
    fetchAppliedCoupons(couponIds),
  ]);

  // OrderItemRecord를 OrderItem으로 변환
  const orderItems = orderItemRecords.map((itemRecord) =>
    mapRecordToOrderItem(itemRecord, productsById, couponsById)
  );

  // OrderStatus 타입 매핑
  const status: Order["status"] =
    orderRecord.status === "취소"
      ? "대기중"
      : (orderRecord.status as Order["status"]);

  return {
    id: orderRecord.id,
    orderNumber: orderRecord.order_number,
    date: orderRecord.created_at.split("T")[0],
    status,
    items: orderItems,
    totalPrice: orderRecord.total_price,
  };
};
