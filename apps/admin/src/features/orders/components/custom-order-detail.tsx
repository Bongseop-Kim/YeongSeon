import { Descriptions, Image, Space, Typography } from "antd";
import type { AdminReformOrderItem, CustomOrderReformData } from "../types/admin-order";

const { Title } = Typography;

interface CustomOrderDetailProps {
  items: AdminReformOrderItem[];
}

export function CustomOrderDetail({ items }: CustomOrderDetailProps) {
  const reformItem = items.find(
    (i) => i.reformData?._tag === "custom"
  );
  if (!reformItem?.reformData) return null;

  const rd = reformItem.reformData as CustomOrderReformData;
  const { options, pricing } = rd;

  return (
    <>
      <Title level={5}>주문 제작 상세</Title>
      <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="넥타이 유형">{options.tie_type ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="심지">{options.interlining ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="디자인 유형">{options.design_type ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="원단 유형">{options.fabric_type ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="원단 지참">{options.fabric_provided ? "예" : "아니오"}</Descriptions.Item>
        <Descriptions.Item label="수량">{rd.quantity}</Descriptions.Item>
      </Descriptions>

      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="삼각봉제">{options.triangle_stitch ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="옆선봉제">{options.side_stitch ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="바택">{options.bar_tack ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="딤플">{options.dimple ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="스포데라토">{options.spoderato ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="7폴드">{options.fold7 ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="브랜드 라벨">{options.brand_label ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="케어 라벨">{options.care_label ? "O" : "-"}</Descriptions.Item>
        <Descriptions.Item label="샘플">{rd.sample ? "O" : "-"}</Descriptions.Item>
      </Descriptions>

      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="봉제비용">{pricing.sewing_cost.toLocaleString()}원</Descriptions.Item>
        <Descriptions.Item label="원단비용">{pricing.fabric_cost.toLocaleString()}원</Descriptions.Item>
        <Descriptions.Item label="합계">{pricing.total_cost.toLocaleString()}원</Descriptions.Item>
      </Descriptions>

      {rd.reference_image_urls.length > 0 && (
        <>
          <Title level={5}>참고 이미지</Title>
          <Image.PreviewGroup>
            <Space wrap style={{ marginBottom: 24 }}>
              {rd.reference_image_urls.map((url, idx) => (
                <Image key={idx} width={120} src={url} />
              ))}
            </Space>
          </Image.PreviewGroup>
        </>
      )}

      {rd.additional_notes && (
        <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="추가 메모">{rd.additional_notes}</Descriptions.Item>
        </Descriptions>
      )}
    </>
  );
}
