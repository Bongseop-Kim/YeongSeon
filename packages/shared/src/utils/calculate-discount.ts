import type { AppliedCoupon } from "../types/view/coupon";

const isExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const now = new Date();
  const expireDate = new Date(expiresAt);
  return expireDate.getTime() < now.getTime();
};

// 쿠폰 할인 금액 계산 (발급 쿠폰 상태/만료 검증 포함)
// qty를 받아 서버(create_order_txn)와 동일하게 라인 단위 캡 적용 후 총 라인 할인액을 반환한다.
// UI 미리보기 전용: 실제 금액 계산의 기준은 RPC 서버이다.
export const calculateDiscount = (
  price: number,
  appliedCoupon: AppliedCoupon | undefined,
  qty = 1
): number => {
  if (
    !appliedCoupon ||
    appliedCoupon.status !== "active" ||
    isExpired(appliedCoupon.expiresAt)
  ) {
    return 0;
  }

  const coupon = appliedCoupon.coupon;
  if (!coupon) return 0;

  let perUnitDiscount: number;
  if (coupon.discountType === "percentage") {
    perUnitDiscount = Math.floor(price * (coupon.discountValue / 100));
  } else {
    perUnitDiscount = Math.floor(coupon.discountValue);
  }
  perUnitDiscount = Math.min(perUnitDiscount, price);

  const lineDiscount = perUnitDiscount * qty;
  const cappedLineDiscount =
    coupon.maxDiscountAmount != null
      ? Math.min(lineDiscount, coupon.maxDiscountAmount)
      : lineDiscount;
  const finalUnitDiscount = Math.floor(cappedLineDiscount / qty);
  const remainder = cappedLineDiscount % qty;
  return finalUnitDiscount * qty + remainder;
};
