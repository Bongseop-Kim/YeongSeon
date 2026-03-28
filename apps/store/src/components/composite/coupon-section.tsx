import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";
import { Button } from "@/components/ui/button";
import { UtilityPageSection } from "@/components/composite/utility-page";

interface CouponSectionProps {
  appliedCoupon: AppliedCoupon | undefined;
  discountAmount: number;
  onChangeCoupon: () => void;
}

export function CouponSection({
  appliedCoupon,
  discountAmount,
  onChangeCoupon,
}: CouponSectionProps) {
  return (
    <UtilityPageSection title="쿠폰" description="사용할 쿠폰을 선택합니다.">
      <div className="border-t border-border">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="text-sm">
            {appliedCoupon ? (
              <p className="font-medium text-foreground">
                {appliedCoupon.coupon.name}
                <span className="ml-2 text-red-500">
                  -{discountAmount.toLocaleString()}원
                </span>
              </p>
            ) : (
              <p className="text-foreground-muted">선택된 쿠폰 없음</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onChangeCoupon}>
            {appliedCoupon ? "변경" : "쿠폰 선택"}
          </Button>
        </div>
      </div>
    </UtilityPageSection>
  );
}
