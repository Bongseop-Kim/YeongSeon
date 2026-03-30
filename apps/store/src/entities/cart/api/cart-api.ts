import { supabase } from "@/shared/lib/supabase";
import type { CartItemViewDTO } from "@yeongseon/shared/types/dto/cart-view";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import {
  toCartItemInputDTO,
  toCartItemView,
} from "@/entities/cart/api/cart-mapper";

const TABLE_NAME = "cart_items";

export const getCartItems = async (userId: string): Promise<CartItem[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  const { data, error } = await supabase.rpc("get_cart_items", {
    p_user_id: userId,
    p_active_only: true,
  });

  if (error) {
    throw new Error(`장바구니 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as CartItemViewDTO[]).map((record) => toCartItemView(record));
};

export const setCartItems = async (
  userId: string,
  items: CartItem[],
): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }

  const { error } = await supabase.rpc("replace_cart_items", {
    p_user_id: userId,
    p_items: items.map(toCartItemInputDTO),
  });

  if (error) {
    throw new Error(`장바구니 저장 실패: ${error.message}`);
  }
};

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

/**
 * 장바구니에서 특정 아이템들을 item_id로 삭제 (결제 성공 후 사용)
 */
export const removeCartItemsByIds = async (
  userId: string,
  itemIds: string[],
): Promise<void> => {
  if (itemIds.length === 0) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("세션이 없습니다. 다시 로그인해주세요.");
  }
  if (session.user.id !== userId) {
    throw new Error(
      "권한이 없습니다. 로그인한 사용자와 요청한 userId가 일치하지 않습니다.",
    );
  }

  const { error } = await supabase.rpc("remove_cart_items_by_ids", {
    p_user_id: userId,
    p_item_ids: itemIds,
  });

  if (error) {
    throw new Error(`장바구니 아이템 삭제 실패: ${error.message}`);
  }
};
