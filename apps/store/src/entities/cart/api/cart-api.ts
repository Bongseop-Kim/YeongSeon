import { supabase } from "@/shared/lib/supabase";

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
