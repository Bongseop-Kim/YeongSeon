import type { OrderOptions, PricingConfig } from "@/entities/custom-order";
import {
  calculateTotalCost,
  getFabricLabel,
  getFinishingLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getTieTypeLabel,
} from "@/features/custom-order";
import type { QuoteRequestDetail } from "@yeongseon/shared";
import {
  formatSpecificationMoney,
  OrderSpecificationConfirmation,
} from "./OrderSpecificationConfirmation";

interface QuoteRequestSpecificationCardProps {
  quoteRequest: QuoteRequestDetail;
  pricingConfig?: PricingConfig;
  className?: string;
}

const toOrderOptions = (quoteRequest: QuoteRequestDetail): OrderOptions => ({
  fabricProvided: quoteRequest.options.fabricProvided,
  reorder: quoteRequest.options.reorder,
  fabricType: quoteRequest.options.fabricType || null,
  designType: quoteRequest.options.designType || null,
  tieType: quoteRequest.options.tieType || null,
  interlining: quoteRequest.options.interlining || null,
  interliningThickness: quoteRequest.options.interliningThickness || null,
  sizeType: quoteRequest.options.sizeType || null,
  tieWidth: quoteRequest.options.tieWidth,
  triangleStitch: quoteRequest.options.triangleStitch,
  sideStitch: quoteRequest.options.sideStitch,
  barTack: quoteRequest.options.barTack,
  fold7: quoteRequest.options.fold7,
  dimple: quoteRequest.options.dimple,
  spoderato: quoteRequest.options.spoderato,
  brandLabel: quoteRequest.options.brandLabel,
  careLabel: quoteRequest.options.careLabel,
  quantity: quoteRequest.quantity,
  referenceImages: null,
  additionalNotes: quoteRequest.additionalNotes,
});

export function QuoteRequestSpecificationCard({
  quoteRequest,
  pricingConfig,
  className,
}: QuoteRequestSpecificationCardProps) {
  const options = toOrderOptions(quoteRequest);
  const estimatedCost = pricingConfig
    ? calculateTotalCost(options, pricingConfig).totalCost
    : undefined;
  const displayCost = quoteRequest.quotedAmount ?? estimatedCost;
  const unitPrice =
    typeof displayCost === "number" && quoteRequest.quantity > 0
      ? displayCost / quoteRequest.quantity
      : undefined;
  const finishingLabel = getFinishingLabel(options).split(" · ");
  const hasQuotedAmount = quoteRequest.quotedAmount != null;
  const additionalNotes = quoteRequest.additionalNotes.trim();

  return (
    <OrderSpecificationConfirmation
      testId="quote-request-specification"
      recipientName={quoteRequest.contactName}
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
        { label: "수량", content: `${quoteRequest.quantity}개` },
        {
          label: "단가",
          content:
            typeof unitPrice === "number"
              ? `${formatSpecificationMoney(unitPrice)}원`
              : "견적대기",
        },
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
            quoteRequest.referenceImageUrls.length > 0
              ? `${quoteRequest.referenceImageUrls.length}개 첨부`
              : "첨부 없음",
        },
        {
          label: "추가 메모",
          value: additionalNotes || "없음",
        },
      ]}
      totalCost={displayCost}
      amountLabel={hasQuotedAmount ? "견적 금액" : "예상 금액 (견적대기)"}
      amountFallback="견적대기"
      className={className}
    />
  );
}
