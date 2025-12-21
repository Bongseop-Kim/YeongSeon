import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/types/cart";
import type { Product } from "@/features/shop/types/product";
import type { Coupon } from "@/types/coupon";
import {
  mapRecordToCartItem,
  mapCartItemToRecord,
  type CartItemRecord,
} from "./cart-mapper";
import { PRODUCTS_DATA } from "@/features/shop/constants/PRODUCTS_DATA";
import { SAMPLE_COUPONS } from "@/types/coupon";

const TABLE_NAME = "cart_items";

/**
 * Product ID로 Product 찾기
 */
function findProductById(productId: number): Product | undefined {
  return PRODUCTS_DATA.find((p) => p.id === productId);
}

/**
 * Coupon ID로 Coupon 찾기
 */
function findCouponById(couponId: string): Coupon | undefined {
  return SAMPLE_COUPONS.find((c) => c.id === couponId);
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

  // DB 레코드를 CartItem으로 변환
  return data.map((record) =>
    mapRecordToCartItem(
      record as CartItemRecord,
      findProductById,
      findCouponById
    )
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
