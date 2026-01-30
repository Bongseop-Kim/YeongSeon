import { supabase } from "@/lib/supabase";

const TABLE_NAME = "product_likes";

/**
 * 제품에 좋아요 추가
 */
export const addLike = async (productId: number): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { error } = await supabase.from(TABLE_NAME).insert({
    user_id: user.id,
    product_id: productId,
  });

  if (error) {
    // 이미 좋아요가 있는 경우 무시 (UNIQUE 제약 조건)
    if (error.code === "23505") {
      return;
    }
    throw new Error(`좋아요 추가 실패: ${error.message}`);
  }
};

/**
 * 제품 좋아요 제거
 */
export const removeLike = async (productId: number): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  if (error) {
    throw new Error(`좋아요 제거 실패: ${error.message}`);
  }
};





