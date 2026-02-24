import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { cartKeys, useSetCartItems } from "@/features/cart/api/cart-query";
import { getCartItems } from "@/features/cart/api/cart-api";
import {
  clearGuest,
  clearMergeLock,
  clearUserCache,
  getGuestItems,
} from "@/features/cart/utils/cart-local-storage";
import { toast } from "@/lib/toast";
import type { CartItem } from "@yeongseon/shared/types/view/cart";

/**
 * 로그인/로그아웃 시 장바구니 동기화를 처리하는 hook
 *
 * 단순화된 전략:
 * - 로그인 시: 로컬(guest) 장바구니가 있으면 서버로 업로드하고 서버 장바구니 사용
 * - 로그아웃 시: guest 장바구니로 전환
 */
export function useCartAuthSync() {
  const userId = useAuthStore((state) => state.user?.id);
  const authInitialized = useAuthStore((state) => state.initialized);
  const previousUserIdRef = useRef<string | undefined>(undefined);
  const isProcessingRef = useRef(false);
  const queryClient = useQueryClient();
  const { mutateAsync } = useSetCartItems();

  useEffect(() => {
    if (!authInitialized) {
      return;
    }

    const previousUserId = previousUserIdRef.current;

    // userId가 변하지 않았으면 아무 작업도 하지 않음
    if (userId === previousUserId) {
      return;
    }

    // 이미 처리 중이면 무시
    if (isProcessingRef.current) {
      return;
    }

    const handleUserChange = async () => {
      isProcessingRef.current = true;

      try {
        // 이전 사용자 정리
        if (previousUserId && previousUserId !== userId) {
          await clearUserCache(previousUserId);
          clearMergeLock(previousUserId);
          queryClient.invalidateQueries({
            queryKey: cartKeys.items(previousUserId),
          });
        }

        // 로그아웃: guest 장바구니로 전환
        if (!userId) {
          const guestItems = await getGuestItems();
          queryClient.setQueryData(cartKeys.guest(), guestItems);
          queryClient.invalidateQueries({ queryKey: cartKeys.guest() });
          previousUserIdRef.current = userId;
          return;
        }

        // 로그인: 서버 장바구니 로드
        let serverItems: CartItem[] = [];
        try {
          serverItems =
            (await queryClient.ensureQueryData<CartItem[]>({
              queryKey: cartKeys.items(userId),
              queryFn: () => getCartItems(userId),
            })) ?? [];
        } catch (error) {
          console.error("서버 장바구니 조회 실패:", error);
          toast.error("장바구니를 불러오지 못했어요.");
          previousUserIdRef.current = userId;
          return;
        }

        // 로컬(guest) 장바구니가 있으면 서버로 업로드
        const guestItems = await getGuestItems();
        if (guestItems.length > 0) {
          try {
            // 로컬 장바구니를 서버로 업로드 (서버 장바구니 대체)
            await mutateAsync(guestItems);
            queryClient.setQueryData(cartKeys.items(userId), guestItems);
            await clearGuest();
          } catch (error) {
            console.error("로컬 장바구니 업로드 실패:", error);
            // 업로드 실패 시 서버 장바구니 사용
            queryClient.setQueryData(cartKeys.items(userId), serverItems);
            toast.error(
              "로컬 장바구니를 서버로 업로드하지 못했습니다. 서버 장바구니를 사용합니다."
            );
          }
        } else {
          // 로컬 장바구니가 없으면 서버 장바구니만 사용
          queryClient.setQueryData(cartKeys.items(userId), serverItems);
        }

        previousUserIdRef.current = userId;
      } catch (error) {
        console.error("장바구니 동기화 실패:", error);
        toast.error("장바구니 동기화 중 오류가 발생했습니다.");
      } finally {
        isProcessingRef.current = false;
      }
    };

    handleUserChange();
  }, [authInitialized, queryClient, mutateAsync, userId]);
}
