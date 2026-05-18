import type { ReactNode } from "react";
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

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, color: "#78716c", fontSize: 12 }}>{label}</p>
      <div
        style={{
          marginTop: 8,
          color: "#18181b",
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.55,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function OptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "5rem minmax(0, 1fr)",
        gap: 12,
        lineHeight: 1.6,
      }}
    >
      <dt style={{ color: "#78716c" }}>{label}</dt>
      <dd style={{ margin: 0, color: "#18181b", fontWeight: 500 }}>{value}</dd>
    </div>
  );
}

export function CustomOrderOptionsDetail({
  options,
  quantity,
  quotedAmount,
}: Props) {
  return (
    <section
      data-testid="admin-custom-order-specification"
      style={{
        marginBottom: 24,
        overflow: "hidden",
        border: "1px solid #d6d3d1",
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #d6d3d1",
          background: "#f5f5f4",
          padding: "16px 20px",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "#18181b",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          주문 사양 확인
        </h3>
      </div>

      <div style={{ borderBottom: "1px solid #d6d3d1", padding: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 24,
          }}
        >
          <SummaryItem label="제작 품목">맞춤 제작 넥타이</SummaryItem>
          <SummaryItem label="수량">{quantity.toLocaleString()}개</SummaryItem>
          <SummaryItem label="단가">
            {formatUnitPrice(quotedAmount, quantity)}
          </SummaryItem>
          <SummaryItem label="견적 금액">
            {formatMoney(quotedAmount)}
          </SummaryItem>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <h4
          style={{
            margin: 0,
            color: "#18181b",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          제작 옵션
        </h4>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "8px 32px",
            margin: "16px 0 0",
          }}
        >
          <OptionRow label="원단" value={getFabricLabel(options)} />
          <OptionRow label="봉제" value={getSewingLabel(options)} />
          <OptionRow
            label="심지"
            value={getInterliningLabel(options.interlining)}
          />
          <OptionRow label="라벨" value={getLabelOptionsLabel(options)} />
        </dl>
      </div>
    </section>
  );
}
