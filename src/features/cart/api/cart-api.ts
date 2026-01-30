import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/features/cart/types/cart";
import type { Product } from "@/features/shop/types/product";

const TABLE_NAME = "cart_items";

export async function getProductsByIds(
  productIds: number[]
): Promise<Map<number, Product>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("get_products_by_ids", {
    p_ids: productIds,
  });

  if (error) {
    throw new Error(
      `장바구니 상품 정보를 불러올 수 없습니다: ${error.message}`
    );
  }

  const records = (data as Product[] | null) ?? [];
  const productsById = new Map<number, Product>(
    records.map((record) => [record.id, record])
  );

  return productsById;
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
    .rpc("get_cart_items", {
      p_user_id: userId,
      p_active_only: true,
    });

  if (error) {
    throw new Error(`장바구니 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }
  return (data as CartItem[]) ?? [];
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

  // PostgreSQL 함수를 통해 트랜잭션으로 원자적 처리
  // 삭제와 삽입이 하나의 트랜잭션으로 처리되어 실패 시 롤백됨
  const { error } = await supabase.rpc("replace_cart_items", {
    p_user_id: userId,
    p_items: items,
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
