import { useFormContext } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPhoneNumber } from "@/features/shipping/utils/phone-format";
import { SummaryRow } from "@/features/custom-order/components/SummaryRow";
import { SAMPLE_COST, SAMPLE_DURATION } from "@/features/custom-order/constants/SAMPLE_PRICING";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";
import type { WizardStepId } from "@/features/custom-order/types/wizard";

interface SampleConfirmStepProps {
  selectedAddress: ShippingAddress | null | undefined;
  onOpenShippingPopup: () => void;
  imageUpload: ImageUploadHook;
  goToStepById: (id: WizardStepId) => void;
}

export const SampleConfirmStep = ({
  selectedAddress,
  onOpenShippingPopup,
  imageUpload,
  goToStepById,
}: SampleConfirmStepProps) => {
  const { watch } = useFormContext<QuoteOrderOptions>();
  const values = watch();

  const sampleType = values.sampleType;
  const cost = sampleType ? SAMPLE_COST[sampleType] : 0;
  const duration = sampleType ? SAMPLE_DURATION[sampleType] : "";

  const sampleTypeLabel =
    sampleType === "sewing"
      ? "봉제 샘플"
      : sampleType === "fabric"
        ? "원단 샘플"
        : sampleType === "fabric_and_sewing"
          ? "원단 + 봉제 샘플"
          : null;

  const fabricLabel = values.fabricProvided
    ? "원단 직접 제공"
    : values.fabricType && values.designType
      ? [
          values.fabricType === "SILK" ? "실크" : "폴리",
          values.designType === "YARN_DYED" ? "선염" : "날염",
        ].join(" · ")
      : null;

  const showSewingOptions = sampleType === "sewing" || sampleType === "fabric_and_sewing";

  const sewingLabel = showSewingOptions && values.tieType
    ? [
        values.tieType === "AUTO" ? "자동 봉제" : "수동 봉제",
        values.dimple
          ? "딤플"
          : values.spoderato
            ? "스포데라토"
            : values.fold7
              ? "7폴드"
              : "일반",
      ].join(" · ")
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          샘플 주문을 확인해주세요
        </h2>
      </div>

      {/* Sample Type & Cost */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <SummaryRow
            label="샘플 유형"
            value={sampleTypeLabel ?? "미선택"}
            onEdit={() => goToStepById("sample-setup")}
          />
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">고정 비용</span>
            <span className="text-sm font-medium text-zinc-900">
              {cost.toLocaleString()}원
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">예상 기간</span>
            <span className="text-sm text-zinc-900">{duration}</span>
          </div>
        </CardContent>
      </Card>

      {/* Option Summary */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {!values.fabricProvided && fabricLabel && (
            <>
              <SummaryRow
                label="원단"
                value={fabricLabel}
                onEdit={() => goToStepById("fabric")}
              />
              <Separator />
            </>
          )}
          {showSewingOptions && sewingLabel && (
            <>
              <SummaryRow
                label="봉제"
                value={sewingLabel}
                onEdit={() => goToStepById("sewing")}
              />
              <Separator />
            </>
          )}
          {(imageUpload.uploadedImages.length > 0 ||
            values.additionalNotes) && (
            <SummaryRow
              label="참고 자료"
              value={[
                imageUpload.uploadedImages.length > 0
                  ? `이미지 ${imageUpload.uploadedImages.length}개`
                  : null,
                values.additionalNotes ? "요청사항 있음" : null,
              ]
                .filter(Boolean)
                .join(", ")}
              onEdit={() => goToStepById("attachment")}
            />
          )}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
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
            <div className="space-y-1 text-sm">
              <p>
                ({selectedAddress.postalCode}) {selectedAddress.address}{" "}
                {selectedAddress.detailAddress}
              </p>
              <p>{formatPhoneNumber(selectedAddress.recipientPhone)}</p>
            </div>
          ) : (
            <div className="text-center py-4 text-zinc-500 text-sm border-2 border-dashed border-zinc-200 rounded-lg">
              배송지를 추가해주세요.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notices */}
      <div className="space-y-2">
        <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          샘플 비용은 본 주문과 별도입니다.
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          샘플 확인 후 본 주문 여부를 결정하시면 됩니다.
        </div>
      </div>
    </div>
  );
};

