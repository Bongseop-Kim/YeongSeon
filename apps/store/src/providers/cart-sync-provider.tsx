import { useCartAuthSync } from "@/features/cart/hooks/useCartAuthSync";

/**
 * Cart 동기화 전용 Provider
 *
 * Auth 이벤트 문자열을 모르고, 오직 userId의 변화만 감지하여 동작합니다.
 * 내부적으로 useCartAuthSync hook이 로그인/로그아웃 시 병합 및 초기화를 처리합니다.
 */
export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  useCartAuthSync();
  return <>{children}</>;
}
