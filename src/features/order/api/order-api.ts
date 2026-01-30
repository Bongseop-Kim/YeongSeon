import { supabase } from "@/lib/supabase";
import type { CreateOrderRequest, CreateOrderResponse } from "./order-mapper";
import { mapOrderItemToRecord, mapRecordToOrderItem } from "./order-mapper";
import { calculateDiscount } from "../utils/calculate-discount";
import type { Order } from "../types/order-item";
import type { OrderRecord, OrderItemRecord } from "../types/order-record";
import { getUserCouponsByIdsMap } from "@/features/order/api/coupons-api";
import { getProductsByIds } from "@/features/cart/api/cart-api";

const ORDERS_TABLE_NAME = "orders";
const ORDER_ITEMS_TABLE_NAME = "order_items";

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

  // 주문 아이템 레코드 준비 (orderId는 나중에 RPC 함수에서 생성됨)
  const orderItemRecords = request.items.map((item) => {
    const unitPrice =
      item.type === "product"
        ? item.product.price + (item.selectedOption?.additionalPrice ?? 0)
        : item.reformData.cost;

    const discountAmount = calculateDiscount(unitPrice, item.appliedCoupon);

    // orderId는 임시로 빈 문자열 사용 (RPC 함수에서 실제 orderId 생성)
    const record = mapOrderItemToRecord(item, "", unitPrice, discountAmount);
    // order_id 필드는 제거 (RPC 함수에서 설정됨)
    const { order_id, ...itemRecordWithoutOrderId } = record;
    return itemRecordWithoutOrderId;
  });

  // RPC 함수를 사용하여 트랜잭션으로 주문과 주문 아이템을 함께 생성
  // 실패 시 자동 롤백되므로 orphaned order가 생성되지 않음
  const { data: orderResult, error: orderError } = await supabase.rpc(
    "create_order_with_items",
    {
      p_user_id: userId,
      p_order_number: orderNumber,
      p_shipping_address_id: request.shippingAddressId,
      p_total_price: request.totals.totalPrice,
      p_original_price: request.totals.originalPrice,
      p_total_discount: request.totals.totalDiscount,
      p_order_items: orderItemRecords as any,
    }
  );

  if (orderError) {
    // RPC 함수가 없는 경우 fallback: 기존 로직 사용
    // RPC 함수가 존재하지 않는 경우 (42883 에러 코드) 기존 방식으로 처리
    if (
      orderError.code === "42883" ||
      orderError.message.includes("function") ||
      orderError.message.includes("does not exist")
    ) {
      console.warn(
        "RPC 함수가 없습니다. 기존 방식으로 처리합니다:",
        orderError.message
      );

      // 기존 방식: 주문 생성 후 주문 아이템 생성, 실패 시 수동 롤백
      const { data: orderData, error: insertOrderError } = await supabase
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

      if (insertOrderError) {
        throw new Error(`주문 생성 실패: ${insertOrderError.message}`);
      }

      const orderId = orderData.id;

      // orderId를 포함한 주문 아이템 레코드 생성
      const orderItemRecordsWithOrderId = request.items.map((item) => {
        const unitPrice =
          item.type === "product"
            ? item.product.price + (item.selectedOption?.additionalPrice ?? 0)
            : item.reformData.cost;

        const discountAmount = calculateDiscount(unitPrice, item.appliedCoupon);

        return mapOrderItemToRecord(item, orderId, unitPrice, discountAmount);
      });

      const { error: insertError } = await supabase
        .from(ORDER_ITEMS_TABLE_NAME)
        .insert(orderItemRecordsWithOrderId);

      if (insertError) {
        // 주문 아이템 생성 실패 시 주문도 롤백
        // 롤백 결과를 확인하고 실패 시 에러를 로깅
        const { error: deleteError, data: deleteData } = await supabase
          .from(ORDERS_TABLE_NAME)
          .delete()
          .eq("id", orderId)
          .select();

        if (deleteError) {
          // 롤백 실패: orphaned order가 생성될 수 있음
          const errorMessage = `주문 아이템 생성 실패 및 롤백 실패: 아이템 생성 오류 - ${insertError.message}, 롤백 오류 - ${deleteError.message}`;
          console.error(
            "심각한 오류: orphaned order가 생성되었을 수 있습니다.",
            {
              orderId,
              insertError: insertError.message,
              deleteError: deleteError.message,
              deleteData,
            }
          );
          throw new Error(errorMessage);
        }

        // 롤백 성공
        throw new Error(`주문 아이템 생성 실패: ${insertError.message}`);
      }

      const fallbackOrderId = orderId;

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
        orderId: fallbackOrderId,
        orderNumber,
      };
    } else {
      // RPC 함수 호출 실패 (다른 이유)
      // RPC 함수 내부에서 트랜잭션이 롤백되었으므로 order는 자동으로 삭제됨
      throw new Error(`주문 생성 실패: ${orderError.message}`);
    }
  }

  // RPC 함수 성공 시 결과 반환
  if (!orderResult) {
    throw new Error("주문 생성 결과를 받을 수 없습니다.");
  }

  const orderId = orderResult.order_id as string;
  const finalOrderNumber = orderResult.order_number as string;

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
    orderNumber: finalOrderNumber,
  };
};


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
    getProductsByIds(productIds),
    (async () => {
      try {
        return await getUserCouponsByIdsMap(couponIds, {
          activeOnly: false,
        });
      } catch (error) {
        console.warn("주문 쿠폰 정보를 불러오지 못했습니다:", error);
        return new Map();
      }
    })(),
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
    getProductsByIds(productIds),
    (async () => {
      try {
        return await getUserCouponsByIdsMap(couponIds, {
          activeOnly: false,
        });
      } catch (error) {
        console.warn("주문 쿠폰 정보를 불러오지 못했습니다:", error);
        return new Map();
      }
    })(),
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
