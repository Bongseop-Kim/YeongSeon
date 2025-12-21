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
  console.log("data", data, error);
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
 */
export const setCartItems = async (
  userId: string,
  items: CartItem[]
): Promise<void> => {
  // 기존 아이템 삭제
  const { error: deleteError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`장바구니 삭제 실패: ${deleteError.message}`);
  }

  // 새 아이템 추가
  if (items.length > 0) {
    // CartItem을 DB 레코드로 변환
    const records = items.map((item) => mapCartItemToRecord(item, userId));

    const { error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert(records);

    if (insertError) {
      throw new Error(`장바구니 저장 실패: ${insertError.message}`);
    }
  }
};

/**
 * 서버에서 장바구니 초기화
 */
export const clearCartItems = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(`장바구니 초기화 실패: ${error.message}`);
  }
};
