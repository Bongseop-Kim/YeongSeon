import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/features/cart/types/cart";
import type { CartItemRecord } from "@/features/cart/types/cart-record";
import { mapRecordToCartItem, mapCartItemToRecord } from "./cart-mapper";
import type { Product, ProductOption } from "@/features/shop/types/product";
import type {
  ProductRecord,
  ProductOptionRecord,
} from "@/features/shop/types/product-record";
import {
  checkLikedProducts,
  getLikeCounts,
} from "@/features/shop/api/likes.api";
import { getUserCouponsByIds } from "@/features/order/api/coupons.api";
import type { AppliedCoupon } from "@/features/order/types/coupon";

const TABLE_NAME = "cart_items";
const PRODUCT_TABLE_NAME = "products";
const PRODUCT_OPTIONS_TABLE_NAME = "product_options";

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
    throw new Error(
      `장바구니 상품 정보를 불러올 수 없습니다: ${error.message}`
    );
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

async function fetchAppliedCoupons(
  couponIds: string[]
): Promise<Map<string, AppliedCoupon>> {
  if (couponIds.length === 0) {
    return new Map();
  }

  try {
    const coupons = await getUserCouponsByIds(couponIds);
    return new Map(coupons.map((coupon) => [coupon.id, coupon]));
  } catch (error) {
    console.warn("장바구니 쿠폰 정보를 불러오지 못했습니다:", error);
    return new Map();
  }
}

/**
 * 서버에서 장바구니 아이템 조회
 */
export const getCartItems = async (userId: string): Promise<CartItem[]> => {
  // 세션이 준비되었는지 확인
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`장바구니 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const records = data as CartItemRecord[];

  const productIds = Array.from(
    new Set(
      records
        .filter(
          (record) =>
            record.item_type === "product" && record.product_id != null
        )
        .map((record) => record.product_id as number)
    )
  );

  const couponIds = Array.from(
    new Set(
      records
        .filter((record) => !!record.applied_coupon_id)
        .map((record) => record.applied_coupon_id as string)
    )
  );

  const [productsById, couponsById] = await Promise.all([
    fetchProductsByIds(productIds),
    fetchAppliedCoupons(couponIds),
  ]);

  // DB 레코드를 CartItem으로 변환
  return records.map((record) =>
    mapRecordToCartItem(record, productsById, couponsById)
  );
};

/**
 * 서버에 장바구니 아이템 저장
 * 트랜잭션을 사용하여 원자적으로 처리 (삭제 후 삽입)
 */
export const setCartItems = async (
  userId: string,
  items: CartItem[]
): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  // CartItem을 DB 레코드로 변환
  const records = items.map((item) => mapCartItemToRecord(item, userId));

  // PostgreSQL 함수를 통해 트랜잭션으로 원자적 처리
  // 삭제와 삽입이 하나의 트랜잭션으로 처리되어 실패 시 롤백됨
  const { error } = await supabase.rpc("replace_cart_items", {
    p_user_id: userId,
    p_items: records,
  });

  if (error) {
    throw new Error(`장바구니 저장 실패: ${error.message}`);
  }
};

/**
 * 서버에서 장바구니 초기화
 */
export const clearCartItems = async (userId: string): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(`장바구니 초기화 실패: ${error.message}`);
  }
};
