import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addLike, removeLike } from "./likes-api";
import { productKeys } from "./products-query";

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
        queryKey: productKeys.detail(productId),
      });

      // 이전 값 저장
      const previousProduct = queryClient.getQueryData(
        productKeys.detail(productId)
      );

      // 낙관적 업데이트
      // 제품 상세 정보도 업데이트
      queryClient.setQueryData(productKeys.detail(productId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !isLiked,
          likes: isLiked ? old.likes - 1 : old.likes + 1,
        };
      });

      return { previousProduct };
    },
    onError: (
      _err,
      _isLiked,
      context:
        | {
            previousProduct: unknown;
          }
        | undefined
    ) => {
      // 에러 발생 시 이전 값으로 롤백
      if (context) {
        queryClient.setQueryData(
          productKeys.detail(productId),
          context.previousProduct
        );
      }
    },
    onSettled: () => {
      // 성공/실패 여부와 관계없이 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.lists(),
      });
    },
  });
};
