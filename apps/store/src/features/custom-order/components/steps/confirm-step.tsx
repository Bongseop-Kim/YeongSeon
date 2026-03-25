import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui-extended/button";
import { ContactInfoSection } from "@/components/composite/ContactInfoSection";
import { formatPhoneNumber } from "@/lib/phone-format";
import { SummaryRow } from "@/features/custom-order/components/summary-row";
import {
  getFabricLabel,
  getFinishingLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getTieTypeLabel,
} from "@/features/custom-order/utils/option-labels";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";
import type { WizardStepId } from "@/features/custom-order/types/wizard";
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
  const values = watch();
  const isQuoteMode = values.quantity >= 100;

  const fabricLabel = getFabricLabel(values);

  const sewingLabel = `${getTieTypeLabel(values.tieType)} · ${getSewingStyleLabel(values)}`;

  const sizeLabel = getSizeLabel(values.sizeType);
  const finishingLabel = getFinishingLabel(values);

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
      <section>
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
            주문 옵션 확인
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            수정이 필요한 항목만 바로 돌아가서 조정할 수 있습니다.
          </p>
        </div>
        <div className="mt-5 divide-y divide-zinc-100 border-y border-stone-200 py-2">
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
            label="참고 자료"
            value={attachmentSummary || "없음"}
            onEdit={() => goToStepById("attachment")}
          />
        </div>
      </section>

      <section className="border-t border-stone-200 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
              배송지 정보
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              수령인과 연락처를 확인한 뒤 최종 제출합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenShippingPopup}
          >
            배송지 관리
          </Button>
        </div>
        <div className="mt-5 border-y border-stone-200 py-4">
          {selectedAddress ? (
            <div className="space-y-1 text-sm text-zinc-700">
              <p className="font-medium text-zinc-950">
                {selectedAddress.recipientName}
              </p>
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
        </div>
      </section>

      {isQuoteMode && (
        <section className="border-t border-stone-200 pt-8">
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
              견적 안내 연락처
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              대량 주문은 확인 후 별도 안내가 진행되므로 담당자 연락처를 남겨
              주세요.
            </p>
          </div>
          <div className="mt-5">
            <ContactInfoSection
              control={control}
              contactMethod={values.contactMethod}
            />
          </div>
        </section>
      )}
    </StepLayout>
  );
};
