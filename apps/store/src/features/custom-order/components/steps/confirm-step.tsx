import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContactInfoSection } from "@/features/quote-request/components/ContactInfoSection";
import { formatPhoneNumber } from "@/features/shipping/utils/phone-format";
import { SummaryRow } from "@/features/custom-order/components/summary-row";
import { usePricingConfig } from "@/features/custom-order/api/pricing-query";
import { calculateSampleCost } from "@/features/custom-order/utils/pricing";
import {
  getFabricLabel,
  getFinishingLabel,
  getSampleTypeLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getTieTypeLabel,
} from "../../utils/option-labels";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type { QuoteOrderOptions } from "../../types/order";
import type { ImageUploadHook } from "../../types/image-upload";
import type { WizardStepId } from "../../types/wizard";
import { StepLayout } from "./step-layout";

interface ConfirmStepProps {
  selectedAddress: ShippingAddress | null | undefined;
  onOpenShippingPopup: () => void;
  imageUpload: ImageUploadHook;
  goToStepById: (id: WizardStepId) => void;
}

export const ConfirmStep = ({
  selectedAddress,
  onOpenShippingPopup,
  imageUpload,
  goToStepById,
}: ConfirmStepProps) => {
  const { control, watch } = useFormContext<QuoteOrderOptions>();
  const { data: pricingConfig } = usePricingConfig();
  const values = watch();
  const isQuoteMode = values.quantity >= 100;

  const fabricLabel = getFabricLabel(values);

  const sewingLabel = `${getTieTypeLabel(values.tieType)} · ${getSewingStyleLabel(values)}`;

  const sizeLabel = getSizeLabel(values.sizeType);
  const finishingLabel = getFinishingLabel(values);
  const sampleTypeLabel = getSampleTypeLabel(values);

  const sampleCost =
    values.sample && values.sampleType && pricingConfig
      ? calculateSampleCost(values.sampleType, pricingConfig)
      : 0;

  const attachmentSummary = [
    imageUpload.uploadedImages.length > 0
      ? `이미지 ${imageUpload.uploadedImages.length}개`
      : null,
    values.additionalNotes ? "요청사항 있음" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <StepLayout
      guideTitle="최종 점검"
      guideItems={[
        "수량/옵션/배송지 재확인",
        "참고자료 누락 여부 확인",
        isQuoteMode
          ? "제출 후 견적 내역으로 이동"
          : "제출 후 주문 내역으로 이동",
      ]}
    >
      <Card>
        <CardContent className="divide-y divide-zinc-100 px-4 py-2">
          <SummaryRow
            label="수량"
            value={`${values.quantity}개`}
            onEdit={() => goToStepById("quantity")}
          />
          <SummaryRow
            label="원단"
            value={fabricLabel}
            onEdit={() => goToStepById("fabric")}
          />
          <SummaryRow
            label="봉제"
            value={sewingLabel}
            onEdit={() => goToStepById("sewing")}
          />
          <SummaryRow
            label="사이즈"
            value={`${sizeLabel}, 폭 ${values.tieWidth}cm`}
            onEdit={() => goToStepById("spec")}
          />
          <SummaryRow
            label="상세 옵션"
            value={finishingLabel}
            onEdit={() => goToStepById("finishing")}
          />

          <SummaryRow
            label="샘플"
            value={
              sampleTypeLabel
                ? `${sampleTypeLabel} (${sampleCost.toLocaleString()}원)`
                : "미선택"
            }
            onEdit={() => goToStepById("sample")}
          />
          <SummaryRow
            label="참고 자료"
            value={attachmentSummary || "없음"}
            onEdit={() => goToStepById("attachment")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedAddress?.recipientName ?? "배송지 정보"}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenShippingPopup}
          >
            배송지 관리
          </Button>
        </CardHeader>
        <CardContent>
          {selectedAddress ? (
            <div className="space-y-1 text-sm text-zinc-700">
              <p>
                ({selectedAddress.postalCode}) {selectedAddress.address}{" "}
                {selectedAddress.detailAddress}
              </p>
              <p>{formatPhoneNumber(selectedAddress.recipientPhone)}</p>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border-2 border-dashed border-zinc-200 py-4 text-center text-sm text-zinc-500">
              <p>배송지를 추가해주세요.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenShippingPopup}
              >
                배송지 추가
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isQuoteMode && (
        <Card>
          <CardContent className="px-4 py-4">
            <ContactInfoSection
              control={control}
              contactMethod={values.contactMethod}
            />
          </CardContent>
        </Card>
      )}
    </StepLayout>
  );
};
