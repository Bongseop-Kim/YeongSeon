/**
 * @deprecated 더 이상 사용되지 않습니다.
 *
 * 이전에는 로컬 장바구니와 서버 장바구니를 복잡하게 병합했지만,
 * 이제는 로컬 장바구니를 서버로 업로드하는 단순한 방식으로 변경되었습니다.
 *
 * 필요시 나중에 다시 활성화할 수 있도록 보관합니다.
 */

import type { CartItem } from "@/features/cart/types/cart";

/**
 * 상품+옵션 조합을 위한 키 생성
 */
function getProductKey(item: CartItem): string | null {
  if (item.type === "product") {
    return `${item.product.id}_${item.selectedOption?.id || "base"}`;
  }
  return null;
}

/**
 * 같은 상품+옵션 조합을 가진 아이템들을 합칩니다.
 * DB 제약 조건(cart_items_unique_user_item)을 준수하기 위해 필요합니다.
 */
function deduplicateProductItems(items: CartItem[]): CartItem[] {
  const productMap = new Map<string, CartItem>();
  const reformItems: CartItem[] = [];

  for (const item of items) {
    if (item.type === "product") {
      const key = getProductKey(item);
      if (key) {
        const existing = productMap.get(key);
        if (existing) {
          // 같은 상품+옵션이 있으면 수량 합산
          productMap.set(key, {
            ...existing,
            quantity: existing.quantity + item.quantity,
          });
        } else {
          // 새로운 상품+옵션 조합
          productMap.set(key, { ...item });
        }
      }
    } else if (item.type === "reform") {
      // 수선 아이템은 ID별로 고유하므로 그대로 유지
      reformItems.push(item);
    }
  }

  return [...Array.from(productMap.values()), ...reformItems];
}

/**
 * 두 장바구니를 병합합니다.
 *
 * @deprecated 더 이상 사용되지 않습니다. useCartAuthSync에서 단순한 업로드 방식으로 변경되었습니다.
 *
 * 병합 전략:
 * 1. 서버 아이템을 기본으로 시작 (서버가 여러 기기에서 동기화된 최신 데이터)
 * 2. 로컬 아이템 중 같은 상품+옵션 조합이 있으면 수량을 합산
 * 3. 그 외 로컬 아이템은 모두 추가 (ID 중복 체크)
 * 4. 최종적으로 같은 상품+옵션 조합을 가진 아이템들을 합쳐서 반환
 *
 * @param localItems 로컬 장바구니 아이템 (현재 기기의 최신 데이터)
 * @param serverItems 서버 장바구니 아이템 (다른 기기와 동기화된 데이터)
 * @returns 병합된 장바구니 아이템 (같은 상품+옵션 조합은 하나로 합쳐짐)
 */
export function mergeCartItems(
  localItems: CartItem[],
  serverItems: CartItem[]
): CartItem[] {
  // 서버 아이템을 기본으로 시작 (새로운 객체 배열로 생성하여 원본 변경 방지)
  const merged: CartItem[] = serverItems.map((item) => ({ ...item }));
  const mergedIds = new Set(serverItems.map((item) => item.id));
  const productKeyMap = new Map<string, number>();

  // 서버 아이템의 상품+옵션 키를 미리 맵에 저장
  for (let i = 0; i < merged.length; i++) {
    const key = getProductKey(merged[i]);
    if (key) {
      productKeyMap.set(key, i);
    }
  }

  for (const localItem of localItems) {
    if (localItem.type === "product") {
      const key = getProductKey(localItem);
      if (key) {
        const existingIndex = productKeyMap.get(key);
        if (existingIndex !== undefined) {
          // 같은 상품+옵션이 있으면 수량 합산
          merged[existingIndex] = {
            ...merged[existingIndex],
            quantity: merged[existingIndex].quantity + localItem.quantity,
          };
        } else if (!mergedIds.has(localItem.id)) {
          // 새로운 아이템 추가 (ID 중복 체크)
          merged.push(localItem);
          mergedIds.add(localItem.id);
          productKeyMap.set(key, merged.length - 1);
        }
        // ID가 이미 있지만 상품+옵션이 다른 경우는 무시 (서버 데이터 우선)
      }
    } else if (localItem.type === "reform") {
      // 수선 아이템은 ID가 다르면 모두 추가 (수선은 각각 고유한 요청)
      if (!mergedIds.has(localItem.id)) {
        merged.push(localItem);
        mergedIds.add(localItem.id);
      }
    }
  }

  // 최종적으로 같은 상품+옵션 조합을 가진 아이템들을 합쳐서 반환
  // (서버에 이미 중복이 있거나, 병합 과정에서 중복이 생길 수 있으므로)
  return deduplicateProductItems(merged);
}
