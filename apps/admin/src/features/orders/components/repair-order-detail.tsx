import { Card, Descriptions, Image, Space, Typography } from "antd";
import type { AdminReformOrderItem, RepairOrderReformData } from "../types/admin-order";

const { Title } = Typography;

interface RepairOrderDetailProps {
  items: AdminReformOrderItem[];
}

export function RepairOrderDetail({ items }: RepairOrderDetailProps) {
  const repairItems = items.filter(
    (i) => i.reformData?._tag === "repair"
  );
  if (repairItems.length === 0) return null;

  return (
    <>
      <Title level={5}>수선 상세</Title>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
        {repairItems.map((item, idx) => {
          const rd = item.reformData as RepairOrderReformData;
          const { ties } = rd;

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
                  column={{ xs: 1, sm: 1, md: 2 }}
                  size="small"
                  style={{ marginBottom: 8 }}
                >
                  {tie.image_url && (
                    <Descriptions.Item label="이미지" span={2}>
                      <Image width={100} src={tie.image_url} />
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="측정방식">
                    {tie.measurement_type === "length" ? "길이 직접 입력" : "키 입력"}
                  </Descriptions.Item>
                  <Descriptions.Item label="측정값">
                    {tie.measurement_value || "-"}
                  </Descriptions.Item>
                  {tie.memo && (
                    <Descriptions.Item label="메모" span={2}>
                      {tie.memo}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ))}
              {ties.length === 0 && (
                <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
                  <Descriptions.Item label="수량">{item.quantity}</Descriptions.Item>
                </Descriptions>
              )}
            </Card>
          );
        })}
      </Space>
    </>
  );
}
