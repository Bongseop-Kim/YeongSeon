import { Card, Descriptions, Image, Space, Typography } from "antd";
import type { AdminReformOrderItem } from "@/features/orders/types/admin-order";

const { Title } = Typography;

interface RepairOrderDetailProps {
  items: AdminReformOrderItem[];
}

export function RepairOrderDetail({ items }: RepairOrderDetailProps) {
  const repairItems = items.filter((i) => i.reformData != null);
  if (repairItems.length === 0) return null;

  return (
    <>
      <Title level={5}>수선 상세</Title>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
        {repairItems.map((item, idx) => {
          if (!item.reformData) return null;
          const { ties } = item.reformData;

          return (
            <Card
              key={item.id}
              size="small"
              title={`넥타이 ${idx + 1}`}
              style={{ marginBottom: 8 }}
            >
              {ties.map((tie, tieIdx) => (
                <Descriptions
                  key={tieIdx}
                  bordered
                  column={2}
                  size="small"
                  style={{ marginBottom: 8 }}
                >
                  {tie.imageUrl && (
                    <Descriptions.Item label="이미지" span={2}>
                      <Image width={100} src={tie.imageUrl} />
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="길이수선">
                    {tie.hasLengthReform ? "O" : "X"}
                  </Descriptions.Item>
                  <Descriptions.Item label="길이 값">
                    {tie.measurementValue
                      ? `${tie.measurementValue}cm (${tie.measurementType === "length" ? "직접 입력" : "키 입력"})`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="폭수선">
                    {tie.hasWidthReform ? "O" : "X"}
                  </Descriptions.Item>
                  <Descriptions.Item label="폭 값">
                    {tie.hasWidthReform && tie.targetWidth != null
                      ? `${tie.targetWidth}cm`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="딤플" span={2}>
                    {tie.dimple ? "O" : "X"}
                  </Descriptions.Item>
                  {tie.memo && (
                    <Descriptions.Item label="메모" span={2}>
                      {tie.memo}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ))}
              {ties.length === 0 && (
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="수량">
                    {item.quantity}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>
          );
        })}
      </Space>
    </>
  );
}
