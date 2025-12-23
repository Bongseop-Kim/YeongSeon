import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLike,
  removeLike,
  checkIsLiked,
  checkLikedProducts,
  getLikeCount,
} from "./likes-api";
import { productKeys } from "./products-query";

/**
 * 좋아요 쿼리 키
 */
export const likeKeys = {
  all: ["likes"] as const,
  product: (productId: number) =>
    [...likeKeys.all, "product", productId] as const,
  isLiked: (productId: number) =>
    [...likeKeys.product(productId), "isLiked"] as const,
  count: (productId: number) =>
    [...likeKeys.product(productId), "count"] as const,
  products: (productIds: number[]) =>
    [...likeKeys.all, "products", productIds] as const,
};

/**
 * 특정 제품의 좋아요 상태 확인
 */
export const useIsLiked = (productId: number) => {
  return useQuery({
    queryKey: likeKeys.isLiked(productId),
    queryFn: () => checkIsLiked(productId),
    enabled: !!productId,
    staleTime: 1000 * 60, // 1분
    retry: 1,
  });
};

/**
 * 여러 제품의 좋아요 상태 확인
 */
export const useLikedProducts = (productIds: number[]) => {
  return useQuery({
    queryKey: likeKeys.products(productIds),
    queryFn: () => checkLikedProducts(productIds),
    enabled: productIds.length > 0,
    staleTime: 1000 * 60, // 1분
    retry: 1,
  });
};

/**
 * 제품의 좋아요 수 조회
 */
export const useLikeCount = (productId: number) => {
  return useQuery({
    queryKey: likeKeys.count(productId),
    queryFn: () => getLikeCount(productId),
    enabled: !!productId,
    staleTime: 1000 * 60, // 1분
    retry: 1,
  });
};

/**
 * 좋아요 추가/제거 뮤테이션
 */
export const useToggleLike = (productId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isLiked: boolean) => {
      if (isLiked) {
        await removeLike(productId);
      } else {
        await addLike(productId);
      }
    },
    onMutate: async (isLiked) => {
      // 낙관적 업데이트를 위한 쿼리 취소
      await queryClient.cancelQueries({
        queryKey: likeKeys.isLiked(productId),
      });
      await queryClient.cancelQueries({
        queryKey: likeKeys.count(productId),
      });
      await queryClient.cancelQueries({
        queryKey: productKeys.detail(productId),
      });

      // 이전 값 저장
      const previousIsLiked = queryClient.getQueryData(
        likeKeys.isLiked(productId)
      );
      const previousCount = queryClient.getQueryData(likeKeys.count(productId));
      const previousProduct = queryClient.getQueryData(
        productKeys.detail(productId)
      );

      // 낙관적 업데이트
      queryClient.setQueryData(likeKeys.isLiked(productId), !isLiked);
      queryClient.setQueryData(
        likeKeys.count(productId),
        (old: number | undefined) => {
          const currentCount = old || 0;
          return isLiked ? currentCount - 1 : currentCount + 1;
        }
      );

      // 제품 상세 정보도 업데이트
      queryClient.setQueryData(productKeys.detail(productId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !isLiked,
          likes: isLiked ? old.likes - 1 : old.likes + 1,
        };
      });

      return { previousIsLiked, previousCount, previousProduct };
    },
    onError: (
      _err,
      _isLiked,
      context:
        | {
            previousIsLiked: unknown;
            previousCount: unknown;
            previousProduct: unknown;
          }
        | undefined
    ) => {
      // 에러 발생 시 이전 값으로 롤백
      if (context) {
        queryClient.setQueryData(
          likeKeys.isLiked(productId),
          context.previousIsLiked
        );
        queryClient.setQueryData(
          likeKeys.count(productId),
          context.previousCount
        );
        queryClient.setQueryData(
          productKeys.detail(productId),
          context.previousProduct
        );
      }
    },
    onSettled: () => {
      // 성공/실패 여부와 관계없이 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: likeKeys.isLiked(productId),
      });
      queryClient.invalidateQueries({
        queryKey: likeKeys.count(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.lists(),
      });
    },
  });
};
