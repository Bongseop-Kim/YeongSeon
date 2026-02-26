import { Show } from "@refinedev/antd";
import { useShow, useList, useUpdate, useOne, useInvalidate, useNavigation } from "@refinedev/core";
import {
  Descriptions,
  Tag,
  Table,
  Button,
  Flex,
  Space,
  Modal,
  Typography,
  Input,
  Select,
  Card,
  Image,
  message,
} from "antd";
import { useState, useEffect } from "react";
import type {
  AdminOrderDetailRowDTO,
  AdminOrderItemRowDTO,
  AdminSettingRowDTO,
  OrderStatusLogDTO,
  OrderType,
} from "@yeongseon/shared";
import {
  COURIER_COMPANY_NAMES,
  buildTrackingUrl,
} from "@yeongseon/shared/constants/courier-companies";
import {
  ORDER_STATUS_FLOW,
  ORDER_ROLLBACK_FLOW,
  ORDER_STATUS_COLORS,
  ORDER_TYPE_LABELS,
} from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";

const { Title, Text } = Typography;
const { TextArea } = Input;

function CustomOrderDetail({ items }: { items: AdminOrderItemRowDTO[] }) {
  const reformItem = items.find(
    (i) => i.itemType === "reform" && i.reformData
  );
  if (!reformItem?.reformData) return null;

  const rd = reformItem.reformData as Record<string, unknown>;
  const options = (rd.options ?? {}) as Record<string, unknown>;
  const pricing = (rd.pricing ?? {}) as Record<string, unknown>;
  const refImages = (rd.reference_image_urls ?? []) as string[];

  return (
    <>
      <Title level={5}>주문 제작 상세</Title>
      <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="넥타이 유형">
          {(options.tie_type as string) ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="심지">
          {(options.interlining as string) ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="디자인 유형">
          {(options.design_type as string) ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="원단 유형">
          {(options.fabric_type as string) ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="원단 지참">
          {options.fabric_provided ? "예" : "아니오"}
        </Descriptions.Item>
        <Descriptions.Item label="수량">
          {(rd.quantity as number) ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="삼각봉제">
          {options.triangle_stitch ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="옆선봉제">
          {options.side_stitch ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="바택">
          {options.bar_tack ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="딤플">
          {options.dimple ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="스포데라토">
          {options.spoderato ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="7폴드">
          {options.fold7 ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="브랜드 라벨">
          {options.brand_label ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="케어 라벨">
          {options.care_label ? "O" : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="샘플">
          {rd.sample ? "O" : "-"}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="봉제비용">
          {((pricing.sewing_cost as number) ?? 0).toLocaleString()}원
        </Descriptions.Item>
        <Descriptions.Item label="원단비용">
          {((pricing.fabric_cost as number) ?? 0).toLocaleString()}원
        </Descriptions.Item>
        <Descriptions.Item label="합계">
          {((pricing.total_cost as number) ?? 0).toLocaleString()}원
        </Descriptions.Item>
      </Descriptions>

      {refImages.length > 0 && (
        <>
          <Title level={5}>참고 이미지</Title>
          <Image.PreviewGroup>
            <Space wrap style={{ marginBottom: 24 }}>
              {refImages.map((url, idx) => (
                <Image key={idx} width={120} src={url} />
              ))}
            </Space>
          </Image.PreviewGroup>
        </>
      )}

      {rd.additional_notes && (
        <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="추가 메모">
            {rd.additional_notes as string}
          </Descriptions.Item>
        </Descriptions>
      )}
    </>
  );
}

function RepairOrderDetail({ items }: { items: AdminOrderItemRowDTO[] }) {
  const reformItems = items.filter(
    (i) => i.itemType === "reform" && i.reformData
  );
  if (reformItems.length === 0) return null;

  return (
    <>
      <Title level={5}>수선 상세</Title>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
        {reformItems.map((item, idx) => {
          const rd = item.reformData as Record<string, unknown>;
          const ties = (rd.ties ?? []) as Record<string, unknown>[];

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
                  {typeof tie.image_url === "string" && (
                    <Descriptions.Item label="이미지" span={2}>
                      <Image width={100} src={tie.image_url} />
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="측정방식">
                    {(tie.measurement_type as string) === "length"
                      ? "길이 직접 입력"
                      : "키 입력"}
                  </Descriptions.Item>
                  <Descriptions.Item label="측정값">
                    {(tie.measurement_value as string) ?? "-"}
                  </Descriptions.Item>
                  {typeof tie.memo === "string" && (
                    <Descriptions.Item label="메모" span={2}>
                      {tie.memo}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ))}
              {ties.length === 0 && (
                <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
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

export default function OrderShow() {
  const { edit, show } = useNavigation();
  const { query: queryResult } = useShow<AdminOrderDetailRowDTO>({
    resource: "admin_order_detail_view",
  });
  const order = queryResult?.data?.data;

  const { data: itemsData } = useList<AdminOrderItemRowDTO>({
    resource: "admin_order_item_view",
    filters: [{ field: "orderId", operator: "eq", value: order?.id }],
    queryOptions: { enabled: !!order?.id },
  });

  const { data: logsData } = useList<OrderStatusLogDTO>({
    resource: "admin_order_status_log_view",
    filters: [
      { field: "orderId", operator: "eq", value: order?.id },
    ],
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!order?.id },
  });

  const { data: courierSettingData } = useOne<AdminSettingRowDTO>({
    resource: "admin_settings",
    id: "default_courier_company",
    meta: { idColumnName: "key" },
    queryOptions: { enabled: true },
  });

  const { mutate: updateOrder, mutation: updateMutation } = useUpdate();
  const invalidate = useInvalidate();

  const [courierCompany, setCourierCompany] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [statusMemo, setStatusMemo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (order) {
      if (courierCompany === "") {
        setCourierCompany(
          order.courierCompany ??
            courierSettingData?.data?.value ??
            ""
        );
      }
      if (trackingNumber === "") {
        setTrackingNumber(order.trackingNumber ?? "");
      }
    }
  }, [order, courierSettingData, courierCompany, trackingNumber]);

  const orderType: OrderType = order?.orderType ?? "sale";
  const statusFlow = ORDER_STATUS_FLOW[orderType];

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    const doUpdate = async () => {
      setIsUpdating(true);
      try {
        const { error } = await supabase.rpc(
          "admin_update_order_status",
          {
            p_order_id: order.id,
            p_new_status: newStatus,
            p_memo: statusMemo || null,
          }
        );

        if (error) {
          message.error(`상태 변경 실패: ${error.message}`);
          return;
        }

        message.success(`상태가 "${newStatus}"(으)로 변경되었습니다.`);
        setStatusMemo("");
        queryResult.refetch();
        invalidate({
          resource: "admin_order_status_log_view",
          invalidates: ["list"],
        });
      } catch (err) {
        message.error(
          `상태 변경 중 오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
        );
      } finally {
        setIsUpdating(false);
      }
    };

    if (newStatus === "취소") {
      Modal.confirm({
        title: "주문 취소",
        content: "정말 이 주문을 취소하시겠습니까?",
        okText: "취소 처리",
        cancelText: "닫기",
        okButtonProps: { danger: true },
        onOk: doUpdate,
      });
      return;
    }

    await doUpdate();
  };

  const handleSaveTracking = () => {
    if (!order) return;
    updateOrder(
      {
        resource: "orders",
        id: order.id,
        values: {
          courier_company: courierCompany || null,
          tracking_number: trackingNumber || null,
        },
      },
      {
        onSuccess: () => {
          message.success("배송 정보가 저장되었습니다.");
        },
      },
    );
  };

  const rollbackFlow = ORDER_ROLLBACK_FLOW[orderType];
  const rollbackStatus = order?.status ? rollbackFlow[order.status] : undefined;

  const handleRollback = (targetStatus: string) => {
    if (!order) return;

    let rollbackMemoValue = "";

    Modal.confirm({
      title: "상태 롤백",
      content: (
        <div>
          <p>
            현재 상태 <Tag>{order.status}</Tag> → <Tag>{targetStatus}</Tag>(으)로 롤백합니다.
          </p>
          <p style={{ marginBottom: 4 }}><strong>사유 (필수)</strong></p>
          <TextArea
            rows={3}
            placeholder="롤백 사유를 입력하세요"
            onChange={(e) => { rollbackMemoValue = e.target.value; }}
          />
        </div>
      ),
      okText: "롤백",
      cancelText: "취소",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!rollbackMemoValue.trim()) {
          message.error("롤백 사유를 입력해주세요.");
          throw new Error("memo required");
        }
        setIsUpdating(true);
        try {
          const { error } = await supabase.rpc("admin_update_order_status", {
            p_order_id: order.id,
            p_new_status: targetStatus,
            p_memo: rollbackMemoValue,
            p_is_rollback: true,
          });
          if (error) {
            message.error(`롤백 실패: ${error.message}`);
            return;
          }
          message.success(`"${targetStatus}"(으)로 롤백되었습니다.`);
          queryResult.refetch();
          invalidate({
            resource: "admin_order_status_log_view",
            invalidates: ["list"],
          });
        } catch (err) {
          if (err instanceof Error && err.message === "memo required") throw err;
          message.error(
            `롤백 중 오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
          );
        } finally {
          setIsUpdating(false);
        }
      },
    });
  };

  const nextStatus = order?.status ? statusFlow[order.status] : undefined;
  const trackingUrl =
    courierCompany && trackingNumber
      ? buildTrackingUrl(courierCompany, trackingNumber)
      : null;

  return (
    <Show>
      <Title level={5}>주문 정보</Title>
      <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="주문번호">
          {order?.orderNumber}
        </Descriptions.Item>
        <Descriptions.Item label="주문일">{order?.date}</Descriptions.Item>
        <Descriptions.Item label="주문유형">
          <Tag>{ORDER_TYPE_LABELS[orderType]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="상태">
          {order?.status && (
            <Tag color={ORDER_STATUS_COLORS[order.status]}>{order.status}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="고객명">
          {order?.userId ? (
            <a
              onClick={(e) => {
                e.stopPropagation();
                show("profiles", order.userId);
              }}
              style={{ cursor: "pointer" }}
            >
              {order.customerName}
            </a>
          ) : (
            order?.customerName
          )}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {order?.customerPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="이메일">
          {order?.customerEmail ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="결제금액">
          <strong>{order?.totalPrice?.toLocaleString()}원</strong>
        </Descriptions.Item>
        <Descriptions.Item label="원가">
          {order?.originalPrice?.toLocaleString()}원
        </Descriptions.Item>
        <Descriptions.Item label="할인">
          {order?.totalDiscount?.toLocaleString()}원
        </Descriptions.Item>
      </Descriptions>

      <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
        <div>
          <Text strong>상태 변경 메모</Text>
          <TextArea
            value={statusMemo}
            onChange={(e) => setStatusMemo(e.target.value)}
            rows={2}
            placeholder="상태 변경 사유 (이력에 기록됨)"
            style={{ marginTop: 4 }}
          />
        </div>
      </Space>

      <Space style={{ marginBottom: 24 }}>
        {nextStatus && (
          <Button
            type="primary"
            loading={isUpdating}
            onClick={() => handleStatusChange(nextStatus)}
          >
            {nextStatus} 으로 변경
          </Button>
        )}
        {rollbackStatus && (
          <Button
            loading={isUpdating}
            onClick={() => handleRollback(rollbackStatus)}
          >
            {rollbackStatus} 으로 롤백
          </Button>
        )}
        {order?.status !== "취소" && order?.status !== "완료" && (
          <Button
            danger
            loading={isUpdating}
            onClick={() => handleStatusChange("취소")}
          >
            취소 처리
          </Button>
        )}
      </Space>

      {orderType === "custom" && (
        <CustomOrderDetail items={itemsData?.data ?? []} />
      )}

      {orderType === "repair" && (
        <RepairOrderDetail items={itemsData?.data ?? []} />
      )}

      <Title level={5}>배송지 정보</Title>
      <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="수령인">
          {order?.recipientName ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {order?.recipientPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="우편번호">
          {order?.shippingPostalCode ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="주소" span={2}>
          {order?.shippingAddress ?? "-"}
          {order?.shippingAddressDetail && ` ${order.shippingAddressDetail}`}
        </Descriptions.Item>
        <Descriptions.Item label="배송메모">
          {order?.deliveryMemo ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="배송요청사항">
          {order?.deliveryRequest ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5}>배송 정보</Title>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
        <Flex wrap="wrap" gap={8}>
          <Select
            value={courierCompany || undefined}
            placeholder="택배사 선택"
            onChange={setCourierCompany}
            style={{ flex: 1, minWidth: 140 }}
            options={COURIER_COMPANY_NAMES.map((name) => ({
              label: name,
              value: name,
            }))}
            allowClear
          />
          <Input
            value={trackingNumber}
            placeholder="송장번호"
            onChange={(e) => setTrackingNumber(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
          />
          <Button
            type="primary"
            onClick={handleSaveTracking}
            loading={updateMutation.isPending}
          >
            저장
          </Button>
          {trackingUrl && (
            <Button
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              배송추적
            </Button>
          )}
        </Flex>
        {order?.shippedAt && (
          <Text type="secondary">
            발송일시: {new Date(order.shippedAt).toLocaleString("ko-KR")}
          </Text>
        )}
      </Space>

      <Title level={5}>주문 아이템</Title>
      <Table
        dataSource={itemsData?.data}
        rowKey="id"
        pagination={false}
      >
        <Table.Column
          dataIndex="productName"
          title="상품명"
          render={(value: string | null, record: AdminOrderItemRowDTO) => {
            if (record.itemType === "reform") return "리폼 상품";
            if (!value) return "-";
            if (record.productId != null) {
              const productId = record.productId;
              return (
                <a
                  onClick={(e) => {
                    e.stopPropagation();
                    edit("products", productId);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {value}
                </a>
              );
            }
            return value;
          }}
        />
        <Table.Column dataIndex="quantity" title="수량" />
        <Table.Column
          dataIndex="unitPrice"
          title="단가"
          render={(v: number) => `${v?.toLocaleString()}원`}
        />
        <Table.Column
          dataIndex="discountAmount"
          title="할인"
          render={(v: number) => `${v?.toLocaleString()}원`}
        />
        <Table.Column
          title="소계"
          render={(_: unknown, record: AdminOrderItemRowDTO) => {
            const subtotal =
              record.unitPrice * record.quantity - record.lineDiscountAmount;
            return `${subtotal.toLocaleString()}원`;
          }}
        />
      </Table>

      <Title level={5}>상태 변경 이력</Title>
      <Table
        dataSource={logsData?.data}
        rowKey="id"
        pagination={false}
        style={{ marginBottom: 24 }}
      >
        <Table.Column
          dataIndex="createdAt"
          title="일시"
          render={(v: string) =>
            v ? new Date(v).toLocaleString("ko-KR") : "-"
          }
        />
        <Table.Column
          dataIndex="previousStatus"
          title="이전 상태"
          render={(v: string) => (
            <Tag color={ORDER_STATUS_COLORS[v]}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="newStatus"
          title="변경 상태"
          render={(v: string) => (
            <Tag color={ORDER_STATUS_COLORS[v]}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="memo"
          title="메모"
          render={(v: string | null) => v ?? "-"}
        />
        <Table.Column
          dataIndex="isRollback"
          title="구분"
          render={(v: boolean) =>
            v ? <Tag color="red">롤백</Tag> : null
          }
        />
      </Table>
    </Show>
  );
}
