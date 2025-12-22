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

/**
 * 사용자가 특정 제품을 좋아요 했는지 확인
 */
export const checkIsLiked = async (productId: number): Promise<boolean> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      // 데이터가 없음
      return false;
    }
    throw new Error(`좋아요 확인 실패: ${error.message}`);
  }

  return !!data;
};

/**
 * 여러 제품의 좋아요 상태 확인
 */
export const checkLikedProducts = async (
  productIds: number[]
): Promise<Set<number>> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || productIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("product_id")
    .eq("user_id", user.id)
    .in("product_id", productIds);

  if (error) {
    throw new Error(`좋아요 확인 실패: ${error.message}`);
  }

  return new Set(data?.map((item) => item.product_id) || []);
};

/**
 * 제품의 좋아요 수 조회
 */
export const getLikeCount = async (productId: number): Promise<number> => {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  if (error) {
    throw new Error(`좋아요 수 조회 실패: ${error.message}`);
  }

  return count || 0;
};

/**
 * 여러 제품의 좋아요 수를 한 번에 조회
 */
export const getLikeCounts = async (
  productIds: number[]
): Promise<Map<number, number>> => {
  if (productIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("product_id")
    .in("product_id", productIds);

  if (error) {
    throw new Error(`좋아요 수 조회 실패: ${error.message}`);
  }

  // 제품별 좋아요 수 집계
  const counts = new Map<number, number>();
  productIds.forEach((id) => counts.set(id, 0));

  data?.forEach((item) => {
    const currentCount = counts.get(item.product_id) || 0;
    counts.set(item.product_id, currentCount + 1);
  });

  return counts;
};
