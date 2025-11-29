export interface Coupon {
  id: string;
  name: string;
  discountAmount: string;
  discountType: "percentage" | "fixed"; // 퍼센트 할인 또는 고정 금액 할인
  discountValue: number; // 할인 값 (퍼센트면 10, 고정이면 5000)
  description: string;
  expiryDate: string;
  additionalInfo?: string;
}

// 샘플 쿠폰 데이터
export const SAMPLE_COUPONS: Coupon[] = [
  {
    id: "coupon1",
    name: "10% 할인 쿠폰",
    discountAmount: "10%",
    discountType: "percentage",
    discountValue: 10,
    description: "전 상품 10% 할인",
    expiryDate: "2025-12-31",
    additionalInfo: "최대 50,000원까지 할인 가능",
  },
  {
    id: "coupon2",
    name: "5,000원 할인 쿠폰",
    discountAmount: "5,000원",
    discountType: "fixed",
    discountValue: 5000,
    description: "5,000원 즉시 할인",
    expiryDate: "2025-12-31",
  },
  {
    id: "coupon3",
    name: "20% 할인 쿠폰",
    discountAmount: "20%",
    discountType: "percentage",
    discountValue: 20,
    description: "특정 카테고리 20% 할인",
    expiryDate: "2025-11-30",
    additionalInfo: "의류 카테고리에만 적용 가능",
  },
];

// 쿠폰 할인 금액 계산
export const calculateDiscount = (
  price: number,
  coupon: Coupon | undefined
): number => {
  if (!coupon) return 0;

  if (coupon.discountType === "percentage") {
    const discountAmount = Math.floor(price * (coupon.discountValue / 100));
    // 최대 할인 금액 체크 (예: 10% 쿠폰은 최대 50,000원)
    if (coupon.id === "coupon1") {
      return Math.min(discountAmount, 50000);
    }
    return discountAmount;
  } else {
    // 고정 금액 할인
    return Math.min(coupon.discountValue, price);
  }
};
