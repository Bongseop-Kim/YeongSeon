import type { CartItem } from "@/types/cart";

/**
 * 두 장바구니를 병합합니다.
 * 병합 전략:
 * 1. 서버 아이템을 기본으로 시작 (서버가 여러 기기에서 동기화된 최신 데이터)
 * 2. 로컬 아이템 중 같은 상품+옵션 조합이 있으면 수량을 합산 (양쪽 모두 유지)
 * 3. 그 외 로컬 아이템은 모두 추가 (중복 ID 체크)
 *
 * @param localItems 로컬 장바구니 아이템 (현재 기기의 최신 데이터)
 * @param serverItems 서버 장바구니 아이템 (다른 기기와 동기화된 데이터)
 * @returns 병합된 장바구니 아이템
 */
export function mergeCartItems(
  localItems: CartItem[],
  serverItems: CartItem[]
): CartItem[] {
  // 서버 아이템을 기본으로 시작
  const merged: CartItem[] = [...serverItems];
  const mergedIds = new Set(serverItems.map((item) => item.id));

  for (const localItem of localItems) {
    if (localItem.type === "product") {
      // 같은 상품 + 같은 옵션 찾기 (ID가 아닌 상품+옵션 조합으로 비교)
      const existingIndex = merged.findIndex(
        (item) =>
          item.type === "product" &&
          item.product.id === localItem.product.id &&
          item.selectedOption?.id === localItem.selectedOption?.id
      );

      if (existingIndex !== -1) {
        // 같은 상품+옵션이 있으면 수량 합산 (양쪽 모두 유지)
        merged[existingIndex].quantity += localItem.quantity;
      } else if (!mergedIds.has(localItem.id)) {
        // 새로운 아이템 추가 (ID 중복 체크)
        merged.push(localItem);
        mergedIds.add(localItem.id);
      }
      // ID가 이미 있지만 상품+옵션이 다른 경우는 무시 (서버 데이터 우선)
    } else if (localItem.type === "reform") {
      // 수선 아이템은 ID가 다르면 모두 추가 (수선은 각각 고유한 요청)
      if (!mergedIds.has(localItem.id)) {
        merged.push(localItem);
        mergedIds.add(localItem.id);
      }
    }
  }

  return merged;
}
