import type { ShippingAddress } from "@/entities/shipping";
import { CouponSection } from "@/shared/composite/coupon-section";
import { UtilityPageSection } from "@/shared/composite/utility-page";
import { getDeliveryRequestLabel } from "@/shared/constants/DELIVERY_REQUEST_OPTIONS";
import { formatPhoneNumber } from "@/shared/lib/phone-format";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui-extended/button";
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

      <UtilityPageSection
        title="배송지"
        description="결제 전에 수령 정보를 마지막으로 확인합니다."
      >
        <div className="border-t border-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {selectedAddress?.recipientName || "배송지 정보"}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                기본 배송지와 수령 요청 사항을 확인합니다.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenShippingPopup}>
              배송지 관리
            </Button>
          </div>

          <Separator />

          {selectedAddress ? (
            <div className="space-y-2 py-5 text-sm">
              <p>
                ({selectedAddress.postalCode}) {selectedAddress.address}{" "}
                {selectedAddress.detailAddress}
              </p>
              <p>{formatPhoneNumber(selectedAddress.recipientPhone)}</p>
              {selectedAddress.deliveryRequest ? (
                <p className="text-foreground-subtle">
                  {getDeliveryRequestLabel(
                    selectedAddress.deliveryRequest,
                    selectedAddress.deliveryMemo,
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="py-8 text-center text-foreground-muted">
              배송지를 추가해주세요.
            </div>
          )}
        </div>
      </UtilityPageSection>
    </>
  );
}
