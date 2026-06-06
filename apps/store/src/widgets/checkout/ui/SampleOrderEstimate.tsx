import type { ImageRef } from "@yeongseon/shared";
import type { SampleOrderPaymentState } from "@/shared/lib/custom-payment-state";
import { getInterliningLabel, getTieTypeLabel } from "@/features/custom-order";
import { OrderSpecificationConfirmation } from "./OrderSpecificationConfirmation";
import { formatSpecificationMoney } from "./order-specification-format";

type SampleOrderOptions = SampleOrderPaymentState["options"];

interface SampleOrderEstimateProps {
  recipientName: string | null | undefined;
  sampleLabel: string;
  fabricLabel: string;
  options: SampleOrderOptions;
  imageRefs: ImageRef[];
  totalCost: number;
}

export function SampleOrderEstimate({
  recipientName,
  sampleLabel,
  fabricLabel,
  options,
  imageRefs,
  totalCost,
}: SampleOrderEstimateProps) {
  return (
    <OrderSpecificationConfirmation
      testId="sample-order-estimate"
      recipientName={recipientName}
      summaryItems={[
        { label: "제작 품목", content: "샘플 넥타이" },
        { label: "샘플 유형", content: sampleLabel },
        { label: "원단 조합", content: fabricLabel },
        { label: "단가", content: `${formatSpecificationMoney(totalCost)}원` },
      ]}
      optionRows={[
        { label: "타이 방식", value: getTieTypeLabel(options.tieType, true) },
        {
          label: "심지",
          value: getInterliningLabel(
            { interlining: options.interlining },
            "미지정",
          ),
        },
        {
          label: "참고 이미지",
          value:
            imageRefs.length > 0 ? `${imageRefs.length}개 첨부` : "첨부 없음",
        },
      ]}
      totalCost={totalCost}
    />
  );
}
