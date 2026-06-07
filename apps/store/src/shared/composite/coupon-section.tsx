import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";
import { formatCouponName } from "@yeongseon/shared/utils/format-coupon-name";
import { Button } from "@/shared/ui/button";
import { UtilityPageSection } from "@/shared/composite/utility-page";

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
    <UtilityPageSection
      title="쿠폰"
      action={
        <Button variant="outline" size="sm" onClick={onChangeCoupon}>
          {appliedCoupon ? "변경" : "쿠폰 선택"}
        </Button>
      }
    >
      <div className="text-sm">
        {appliedCoupon ? (
          <p className="font-medium text-foreground">
            {formatCouponName(appliedCoupon.coupon)}
            <span className="ml-2 text-red-500">
              -{discountAmount.toLocaleString()}원
            </span>
          </p>
        ) : (
          <p className="text-foreground-muted">선택된 쿠폰 없음</p>
        )}
      </div>
    </UtilityPageSection>
  );
}
