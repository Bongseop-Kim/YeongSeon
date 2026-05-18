import type { ImageRef } from "@yeongseon/shared";
import type { CustomOrderPaymentState } from "@/shared/lib/custom-payment-state";
import {
  getFabricLabel,
  getFinishingLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getTieTypeLabel,
} from "@/features/custom-order";
import {
  formatSpecificationMoney,
  OrderSpecificationConfirmation,
} from "./OrderSpecificationConfirmation";

type CustomOrderOptions = CustomOrderPaymentState["coreOptions"];

interface CustomOrderEstimateProps {
  recipientName: string | null | undefined;
  options: CustomOrderOptions;
  imageRefs: ImageRef[];
  totalCost: number;
  issuedAt?: Date;
  className?: string;
}

export function CustomOrderEstimate({
  recipientName,
  options,
  imageRefs,
  totalCost,
  className,
}: CustomOrderEstimateProps) {
  const quantity = options.quantity;
  const unitPrice = quantity > 0 ? totalCost / quantity : totalCost;
  const finishingLabel = getFinishingLabel(options).split(" · ");

  return (
    <OrderSpecificationConfirmation
      testId="custom-order-estimate"
      recipientName={recipientName}
      summaryItems={[
        { label: "제작 품목", content: "맞춤 제작 넥타이" },
        {
          label: "사이즈",
          content: (
            <>
              <p>{getSizeLabel(options.sizeType)}</p>
              <p>폭 {options.tieWidth}cm</p>
            </>
          ),
        },
        { label: "수량", content: `${quantity}개` },
        { label: "단가", content: `${formatSpecificationMoney(unitPrice)}원` },
      ]}
      optionRows={[
        { label: "원단", value: getFabricLabel(options, "미정") },
        {
          label: "봉제",
          value: `${getTieTypeLabel(options.tieType, true)} · ${getSewingStyleLabel(options)}`,
        },
        { label: "심지", value: finishingLabel[0] ?? "미정" },
        { label: "라벨", value: finishingLabel[1] ?? "없음" },
        {
          label: "참고 이미지",
          value:
            imageRefs.length > 0 ? `${imageRefs.length}개 첨부` : "첨부 없음",
        },
      ]}
      totalCost={totalCost}
      className={className}
    />
  );
}
