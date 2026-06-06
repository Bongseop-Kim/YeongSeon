import { Field, FieldContent, FieldTitle } from "@/shared/ui/field";
import { UtilityPageSection } from "@/shared/composite/utility-page";
import type { ShippingAddress } from "@/entities/shipping";
import {
  RepairAddressRows,
  RepairAddressCopyButton,
} from "@/features/order/repair-shipping/components/repair-address-rows";
import { TrackingModeToggle } from "@/features/order/repair-shipping/components/tracking-mode-toggle";
import { TrackingFormFields } from "@/features/order/repair-shipping/components/tracking-form-fields";
import { NoTrackingFormFields } from "@/features/order/repair-shipping/components/no-tracking-form-fields";
import { PickupRequestFields } from "@/features/order/repair-shipping/components/pickup-request-fields";
import { RepairShippingMethodChoice } from "@/features/order/repair-shipping/components/shipping-method-choice";
import type {
  RepairShippingInputActions,
  RepairShippingInputState,
} from "@/features/order/repair-shipping/use-repair-shipping-input";

interface OrderRepairShippingSectionProps {
  state: RepairShippingInputState;
  actions: RepairShippingInputActions;
  selectedAddress: ShippingAddress | null;
  pickupFee?: number;
}

const toPickupShippingAddress = (selectedAddress: ShippingAddress | null) =>
  selectedAddress
    ? {
        name: selectedAddress.recipientName,
        phone: selectedAddress.recipientPhone,
        address: [selectedAddress.address, selectedAddress.detailAddress]
          .filter(Boolean)
          .join(" "),
      }
    : null;

export function OrderRepairShippingSection({
  state,
  actions,
  selectedAddress,
  pickupFee,
}: OrderRepairShippingSectionProps) {
  return (
    <UtilityPageSection
      title="수선품 발송"
      description="수선품을 보내는 방법을 선택해주세요."
    >
      <div className="border-t border-stone-200 pt-5">
        <RepairShippingMethodChoice
          value={state.repairMethod}
          onChange={actions.setRepairMethod}
          pickupBadge={
            pickupFee ? `+${pickupFee.toLocaleString()}원` : undefined
          }
          directContent={
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <FieldTitle as="h3" className="text-zinc-950">
                    수선품 보내실 곳
                  </FieldTitle>
                  <RepairAddressCopyButton />
                </div>
                <RepairAddressRows className="mt-4" />
              </div>
              <Field>
                <FieldTitle>
                  이미 발송하셨나요?{" "}
                  <span className="font-normal text-zinc-400">(선택)</span>
                </FieldTitle>
                <FieldContent className="gap-4">
                  <TrackingModeToggle
                    value={state.trackingMode}
                    onChange={actions.setTrackingMode}
                  />
                  {state.trackingMode === "has-tracking" ? (
                    <TrackingFormFields
                      idPrefix="order-form"
                      courierCompany={state.courierCompany}
                      onCourierCompanyChange={actions.setCourierCompany}
                      trackingNumber={state.trackingNumber}
                      onTrackingNumberChange={actions.setTrackingNumber}
                      photos={state.trackingPhotos}
                      onPhotosChange={actions.setTrackingPhotos}
                    />
                  ) : null}
                  {state.trackingMode === "no-tracking" ? (
                    <NoTrackingFormFields
                      idPrefix="order-form"
                      reason={state.noTrackingReason}
                      onReasonChange={actions.setNoTrackingReason}
                      photos={state.noTrackingPhotos}
                      onPhotosChange={actions.setNoTrackingPhotos}
                      memo={state.noTrackingMemo}
                      onMemoChange={actions.setNoTrackingMemo}
                    />
                  ) : null}
                </FieldContent>
              </Field>
            </div>
          }
          pickupContent={
            <PickupRequestFields
              value={state.pickupInfo}
              onChange={actions.setPickupInfo}
              shippingAddress={toPickupShippingAddress(selectedAddress)}
              onSearchAddress={() => actions.setPickupPostcodeOpen(true)}
            />
          }
        />
      </div>
    </UtilityPageSection>
  );
}
