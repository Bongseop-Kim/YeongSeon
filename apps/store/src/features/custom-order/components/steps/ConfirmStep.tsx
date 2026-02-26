import { useFormContext } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ContactInfoSection } from "@/features/quote-request/components/ContactInfoSection";
import { formatPhoneNumber } from "@/features/shipping/utils/phone-format";
import { SummaryRow } from "@/features/custom-order/components/SummaryRow";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";
import type { WizardStepId } from "@/features/custom-order/types/wizard";

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

  const fabricLabel = values.fabricProvided
    ? "원단 직접 제공"
    : values.reorder
      ? "재주문"
      : values.fabricType && values.designType
        ? [
            values.fabricType === "SILK" ? "실크" : "폴리",
            values.designType === "YARN_DYED" ? "선염" : "날염",
          ].join(" · ")
        : "미선택";

  const sewingLabel = values.tieType
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
    : "미선택";

  const sizeLabel = values.sizeType === "CHILD" ? "아동용" : values.sizeType ? "성인용" : "미선택";

  const interliningLabel = [
    values.interlining === "WOOL" ? "울 심지" : values.interlining ? "폴리 심지" : null,
    values.interliningThickness === "THIN" ? "얇음" : values.interliningThickness ? "두꺼움" : null,
  ].filter(Boolean).join(", ") || "미선택";

  const additionalStitch = [
    values.triangleStitch && "삼각 봉제",
    values.sideStitch && "옆선 봉제",
    values.barTack && "바택 처리",
  ].filter(Boolean);

  const labels = [
    values.brandLabel && "브랜드 라벨",
    values.careLabel && "케어 라벨",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          주문 내역을 확인해주세요
        </h2>
      </div>

      {/* Order Summary */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <SummaryRow
            label="수량"
            value={`${values.quantity}개`}
            onEdit={() => goToStepById("quantity")}
          />
          <Separator />
          <SummaryRow
            label="원단"
            value={fabricLabel}
            onEdit={() => goToStepById("fabric")}
          />
          <Separator />
          <SummaryRow
            label="봉제"
            value={sewingLabel}
            onEdit={() => goToStepById("sewing")}
          />
          <Separator />
          <SummaryRow
            label="규격"
            value={`${sizeLabel}, 폭 ${values.tieWidth}cm`}
            onEdit={() => goToStepById("spec")}
          />
          <Separator />
          <SummaryRow
            label="심지"
            value={interliningLabel}
            onEdit={() => goToStepById("finishing")}
          />
          {additionalStitch.length > 0 && (
            <>
              <Separator />
              <SummaryRow
                label="추가 봉제"
                value={additionalStitch.join(", ")}
                onEdit={() => goToStepById("finishing")}
              />
            </>
          )}
          {labels.length > 0 && (
            <>
              <Separator />
              <SummaryRow
                label="라벨"
                value={labels.join(", ")}
                onEdit={() => goToStepById("finishing")}
              />
            </>
          )}
          {(imageUpload.uploadedImages.length > 0 ||
            values.additionalNotes) && (
            <>
              <Separator />
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
            </>
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

      {/* Quote Mode Contact Info */}
      {isQuoteMode && (
        <Card>
          <CardContent className="pt-6">
            <ContactInfoSection
              control={control}
              contactMethod={values.contactMethod}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

