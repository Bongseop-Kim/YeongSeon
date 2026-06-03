import { Text } from "seed-design/ui/text";
import { AdminDetailItem, AdminDetailList } from "@/components/AdminDetailList";
import { formatMoney } from "@/utils/format-number";
import type { QuoteRequestOptions } from "@/features/quote-requests/types/admin-quote-request";

interface Props {
  options: QuoteRequestOptions;
  quantity: number;
  quotedAmount: number | null;
}

const normalize = (value: string) => value.trim().toLowerCase();

const formatUnitPrice = (quotedAmount: number | null, quantity: number) => {
  if (quotedAmount === null || quantity <= 0) return "-";
  return formatMoney(quotedAmount / quantity);
};

const labelFromMap = (value: string, labels: Record<string, string>) => {
  const key = normalize(value);
  return key ? (labels[key] ?? value) : "미선택";
};

const getFabricLabel = (options: QuoteRequestOptions) => {
  if (options.fabricProvided) return "원단 직접 제공";

  const fabric = labelFromMap(options.fabricType, {
    silk: "실크",
    poly: "폴리",
  });
  const design = labelFromMap(options.designType, {
    printing: "날염",
    print: "날염",
    yarn_dyed: "선염",
    yarndyed: "선염",
    classic: "클래식",
  });

  if (fabric === "미선택" && design === "미선택") return "미선택";
  return [fabric, design].filter((part) => part !== "미선택").join(" · ");
};

const getTieLabel = (tieType: string) =>
  labelFromMap(tieType, {
    auto: "자동 타이",
    manual: "수동 타이",
    "3fold": "3폴드",
  });

const getInterliningLabel = (interlining: string) =>
  labelFromMap(interlining, {
    wool: "울 심지",
    poly: "폴리 심지",
  });

const getSewingLabel = (options: QuoteRequestOptions) => {
  const details = [
    options.triangleStitch ? "삼각봉제" : null,
    options.sideStitch ? "옆선봉제" : null,
    options.barTack ? "바택" : null,
    options.dimple ? "딤플" : null,
    options.spoderato ? "스포데라토" : null,
    options.fold7 ? "7폴드" : null,
  ].filter(Boolean);

  return `${getTieLabel(options.tieType)} · ${
    details.length > 0 ? details.join(", ") : "일반"
  }`;
};

const getLabelOptionsLabel = (options: QuoteRequestOptions) => {
  const labels = [
    options.brandLabel ? "브랜드 라벨" : null,
    options.careLabel ? "케어 라벨" : null,
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(", ") : "라벨 없음";
};

export function CustomOrderOptionsDetail({
  options,
  quantity,
  quotedAmount,
}: Props) {
  return (
    <section
      className="quoteRequestPanel"
      aria-labelledby="quote-custom-options-title"
      data-testid="admin-custom-order-specification"
    >
      <div className="quoteRequestPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id="quote-custom-options-title"
          className="quoteRequestPanelTitle"
        >
          주문 사양 확인
        </Text>
      </div>

      <AdminDetailList>
        <AdminDetailItem label="제작 품목">맞춤 제작 넥타이</AdminDetailItem>
        <AdminDetailItem label="수량">
          {quantity.toLocaleString()}개
        </AdminDetailItem>
        <AdminDetailItem label="단가">
          {formatUnitPrice(quotedAmount, quantity)}
        </AdminDetailItem>
        <AdminDetailItem label="견적 금액">
          {formatMoney(quotedAmount)}
        </AdminDetailItem>
      </AdminDetailList>

      <div className="quoteRequestOptionGroup">
        <Text
          as="h3"
          textStyle="t5Bold"
          className="quoteRequestSubsectionTitle"
        >
          제작 옵션
        </Text>
        <AdminDetailList>
          <AdminDetailItem label="원단">
            {getFabricLabel(options)}
          </AdminDetailItem>
          <AdminDetailItem label="봉제">
            {getSewingLabel(options)}
          </AdminDetailItem>
          <AdminDetailItem label="심지">
            {getInterliningLabel(options.interlining)}
          </AdminDetailItem>
          <AdminDetailItem label="라벨">
            {getLabelOptionsLabel(options)}
          </AdminDetailItem>
        </AdminDetailList>
      </div>
    </section>
  );
}
