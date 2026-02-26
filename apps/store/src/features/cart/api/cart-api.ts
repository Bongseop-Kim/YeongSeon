import { supabase } from "@/lib/supabase";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { CartItemViewDTO } from "@yeongseon/shared/types/dto/cart-view";
import type { Product } from "@yeongseon/shared/types/view/product";
import { productService } from "@/features/shop/api/product-service";
import { toCartItemInputDTO, toCartItemView } from "@/features/cart/api/cart-mapper";

const TABLE_NAME = "cart_items";

export async function getProductsByIds(
  productIds: number[]
): Promise<Map<number, Product>> {
  return productService.getProductsByIds(productIds);
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
  const records = (data as CartItemViewDTO[] | null) ?? [];
  return records.map((record) => toCartItemView(record));
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
    p_items: items.map(toCartItemInputDTO),
  });

  if (error) {
    throw new Error(`장바구니 저장 실패: ${error.message}`);
  }
};

/**
 * 장바구니에서 특정 아이템들을 item_id로 삭제 (결제 성공 후 사용)
 */
export const removeCartItemsByIds = async (
  userId: string,
  itemIds: string[]
): Promise<void> => {
  if (itemIds.length === 0) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }
  if (session.user.id !== userId) {
    throw new Error("권한이 없습니다. 로그인한 사용자와 요청한 userId가 일치하지 않습니다.");
  }

  const { error } = await supabase.rpc("remove_cart_items_by_ids", {
    p_user_id: userId,
    p_item_ids: itemIds,
  });

  if (error) {
    throw new Error(`장바구니 아이템 삭제 실패: ${error.message}`);
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
