import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { CartAuthBridge } from "@/features/cart/model/cart-auth-bridge";

/**
 * Cart 동기화 전용 Provider
 *
 * Auth 이벤트 문자열을 모르고, 오직 userId의 변화만 감지하여 동작합니다.
 * Auth와 완전히 분리되어 있어 유지보수가 쉽습니다.
 *
 * useAuthStore를 직접 구독하여 userId 변화를 감지합니다.
 */
export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((state) => state.user?.id);
  const initialized = useAuthStore((state) => state.initialized);
  const previousUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // 초기화 완료 전에는 무시
    if (!initialized) {
      return;
    }

    const previousUserId = previousUserIdRef.current;

    // userId 변화 감지
    if (userId !== previousUserId) {
      CartAuthBridge.handleUserIdChange(userId, previousUserId).catch(
        (error) => {
          console.error("Failed to handle userId change:", error);
        }
      );
      previousUserIdRef.current = userId;
    }
  }, [userId, initialized]);

  return <>{children}</>;
}
