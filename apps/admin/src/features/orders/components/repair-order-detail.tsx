import { Text } from "seed-design/ui/text";
import type { AdminReformOrderItem } from "@/features/orders/types/admin-order";
import { OrderDetailGrid, OrderDetailItem } from "./order-detail-grid";

interface RepairOrderDetailProps {
  items: AdminReformOrderItem[];
}

function yn(value: boolean): string {
  return value ? "O" : "X";
}

export function RepairOrderDetail({ items }: RepairOrderDetailProps) {
  const repairItems = items.filter((item) => item.reformData != null);
  if (repairItems.length === 0) return null;

  return (
    <div className="orderOptionCard">
      <Text as="h2" textStyle="t6Bold" className="orderSectionTitle">
        수선 상세
      </Text>
      {repairItems.map((item, index) => {
        if (!item.reformData) return null;
        const { ties } = item.reformData;

        return (
          <section key={item.id} className="orderRepairCard">
            <Text as="h3" textStyle="t5Bold" className="orderSubsectionTitle">
              넥타이 {index + 1}
            </Text>
            {ties.length === 0 ? (
              <OrderDetailGrid>
                <OrderDetailItem label="수량">{item.quantity}</OrderDetailItem>
              </OrderDetailGrid>
            ) : null}
            {ties.map((tie, tieIndex) => (
              <OrderDetailGrid key={`${item.id}-${tieIndex}`}>
                {tie.imageUrl ? (
                  <OrderDetailItem label="이미지" full>
                    <a href={tie.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        className="orderPreviewImage"
                        src={tie.imageUrl}
                        alt="수선 대상 넥타이"
                        width={120}
                        height={120}
                      />
                    </a>
                  </OrderDetailItem>
                ) : null}
                <OrderDetailItem label="길이수선">
                  {yn(tie.hasLengthReform)}
                </OrderDetailItem>
                <OrderDetailItem label="길이 값">
                  {tie.hasLengthReform && tie.measurementValue
                    ? `${tie.measurementValue}cm (${tie.measurementType === "length" ? "직접 입력" : "키 입력"})`
                    : "-"}
                </OrderDetailItem>
                <OrderDetailItem label="폭수선">
                  {yn(tie.hasWidthReform)}
                </OrderDetailItem>
                <OrderDetailItem label="폭 값">
                  {tie.hasWidthReform && tie.targetWidth != null
                    ? `${tie.targetWidth}cm`
                    : "-"}
                </OrderDetailItem>
                <OrderDetailItem label="딤플">
                  {tie.hasLengthReform ? yn(tie.dimple) : "-"}
                </OrderDetailItem>
                {tie.memo ? (
                  <OrderDetailItem label="메모" full>
                    {tie.memo}
                  </OrderDetailItem>
                ) : null}
              </OrderDetailGrid>
            ))}
          </section>
        );
      })}
    </div>
  );
}
