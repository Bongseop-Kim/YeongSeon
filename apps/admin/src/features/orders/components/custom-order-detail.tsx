import { Text } from "seed-design/ui/text";
import type {
  AdminCustomOrderItem,
  AdminSampleOrderItem,
  CustomOrderOptions,
  CustomOrderPricing,
} from "@/features/orders/types/admin-order";
import { OrderDetailGrid, OrderDetailItem } from "./order-detail-grid";

interface CustomOrderDetailProps {
  items: AdminCustomOrderItem[] | AdminSampleOrderItem[];
}

function yn(value: boolean): string {
  return value ? "O" : "-";
}

function money(value: number): string {
  return `${value.toLocaleString()}원`;
}

function ReferenceImages({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  return (
    <section className="orderOptionCard" aria-label="참고 이미지">
      <Text as="h3" textStyle="t5Bold" className="orderSubsectionTitle">
        참고 이미지
      </Text>
      <div className="orderImageGrid">
        {urls.map((url, index) => (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <img
              className="orderPreviewImage"
              src={url}
              alt="참고 이미지"
              width={120}
              height={120}
            />
          </a>
        ))}
      </div>
    </section>
  );
}

function AdditionalNotes({ notes }: { notes: string | null }) {
  if (!notes) return null;
  return (
    <OrderDetailGrid>
      <OrderDetailItem label="추가 메모" full>
        {notes}
      </OrderDetailItem>
    </OrderDetailGrid>
  );
}

function OptionsGrid({
  options,
  quantity,
}: {
  options: CustomOrderOptions;
  quantity: number;
}) {
  return (
    <OrderDetailGrid>
      <OrderDetailItem label="넥타이 유형">
        {options.tieType ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="심지">
        {options.interlining ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="디자인 유형">
        {options.designType ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="원단 유형">
        {options.fabricType ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="원단 지참">
        {options.fabricProvided ? "예" : "아니오"}
      </OrderDetailItem>
      <OrderDetailItem label="수량">{quantity}</OrderDetailItem>
      <OrderDetailItem label="삼각봉제">
        {yn(options.triangleStitch)}
      </OrderDetailItem>
      <OrderDetailItem label="옆선봉제">
        {yn(options.sideStitch)}
      </OrderDetailItem>
      <OrderDetailItem label="바택">{yn(options.barTack)}</OrderDetailItem>
      <OrderDetailItem label="딤플">{yn(options.dimple)}</OrderDetailItem>
      <OrderDetailItem label="스포데라토">
        {yn(options.spoderato)}
      </OrderDetailItem>
      <OrderDetailItem label="7폴드">{yn(options.fold7)}</OrderDetailItem>
      <OrderDetailItem label="브랜드 라벨">
        {yn(options.brandLabel)}
      </OrderDetailItem>
      <OrderDetailItem label="케어 라벨">
        {yn(options.careLabel)}
      </OrderDetailItem>
    </OrderDetailGrid>
  );
}

function PricingGrid({ pricing }: { pricing: CustomOrderPricing }) {
  return (
    <OrderDetailGrid>
      <OrderDetailItem label="봉제비용">
        {money(pricing.sewingCost)}
      </OrderDetailItem>
      <OrderDetailItem label="원단비용">
        {money(pricing.fabricCost)}
      </OrderDetailItem>
      <OrderDetailItem label="합계">{money(pricing.totalCost)}</OrderDetailItem>
    </OrderDetailGrid>
  );
}

export function CustomOrderDetail({ items }: CustomOrderDetailProps) {
  const firstItem = items[0];
  if (!firstItem) return null;

  if (firstItem.type === "sample") {
    return <SampleOrderDetail item={firstItem} />;
  }

  const reformItem = items.find(
    (item): item is AdminCustomOrderItem =>
      item.type === "custom" && item.customData != null,
  );
  if (!reformItem?.customData) return null;

  const data = reformItem.customData;

  return (
    <div className="orderOptionCard">
      <Text as="h2" textStyle="t6Bold" className="orderSectionTitle">
        주문 제작 상세
      </Text>
      <OptionsGrid options={data.options} quantity={data.quantity} />
      <PricingGrid pricing={data.pricing} />
      <ReferenceImages urls={data.referenceImageUrls} />
      <AdditionalNotes notes={data.additionalNotes} />
    </div>
  );
}

function SampleOrderDetail({ item }: { item: AdminSampleOrderItem }) {
  if (!item.sampleData) return null;

  const { sampleData } = item;
  const { options, pricing } = sampleData;

  return (
    <div className="orderOptionCard">
      <Text as="h2" textStyle="t6Bold" className="orderSectionTitle">
        샘플 제작 상세
      </Text>
      <OrderDetailGrid>
        <OrderDetailItem label="샘플 유형">
          {sampleData.sampleType}
        </OrderDetailItem>
        <OrderDetailItem label="수량">{item.quantity}</OrderDetailItem>
        <OrderDetailItem label="넥타이 유형">
          {options.tieType ?? "-"}
        </OrderDetailItem>
        <OrderDetailItem label="심지">
          {options.interlining ?? "-"}
        </OrderDetailItem>
        <OrderDetailItem label="디자인 유형">
          {options.designType ?? "-"}
        </OrderDetailItem>
        <OrderDetailItem label="원단 유형">
          {options.fabricType ?? "-"}
        </OrderDetailItem>
        <OrderDetailItem label="고정 금액">
          {money(pricing.totalCost)}
        </OrderDetailItem>
      </OrderDetailGrid>
      <ReferenceImages urls={sampleData.referenceImageUrls} />
      <AdditionalNotes notes={sampleData.additionalNotes} />
    </div>
  );
}
