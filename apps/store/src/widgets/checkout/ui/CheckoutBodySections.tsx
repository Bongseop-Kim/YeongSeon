import type { ShippingAddress } from "@/entities/shipping";
import { CouponSection } from "@/shared/composite/coupon-section";
import { Separator } from "@/shared/ui/separator";
import { ShippingAddressCard } from "@/widgets/shipping-address-card";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";

interface CheckoutBodySectionsProps {
  appliedCoupon: AppliedCoupon | undefined;
  discountAmount: number;
  onChangeCoupon: () => void;
  selectedAddress: ShippingAddress | null;
  onOpenShippingPopup: () => void;
}

export function CheckoutBodySections({
  appliedCoupon,
  discountAmount,
  onChangeCoupon,
  selectedAddress,
  onOpenShippingPopup,
}: CheckoutBodySectionsProps) {
  return (
    <>
      <CouponSection
        appliedCoupon={appliedCoupon}
        discountAmount={discountAmount}
        onChangeCoupon={onChangeCoupon}
      />

      <Separator />

      <ShippingAddressCard
        address={selectedAddress ?? null}
        editable
        onChangeClick={onOpenShippingPopup}
      />
    </>
  );
}
