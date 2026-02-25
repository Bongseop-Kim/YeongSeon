import { Show } from "@refinedev/antd";
import { useShow, useList } from "@refinedev/core";
import {
  Descriptions,
  Tag,
  Table,
  Button,
  Space,
  Modal,
  Typography,
  InputNumber,
  Input,
  Image,
  message,
} from "antd";
import { useState } from "react";
import type {
  AdminQuoteRequestDetailRowDTO,
  QuoteRequestStatusLogDTO,
} from "@yeongseon/shared";
import {
  QUOTE_REQUEST_STATUS_FLOW,
  QUOTE_REQUEST_STATUS_COLORS,
  CONTACT_METHOD_LABELS,
} from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";

const { Title, Text } = Typography;
const { TextArea } = Input;

function CustomOrderOptionsDetail({
  options,
}: {
  options: Record<string, unknown>;
}) {
  return (
    <>
      <Title level={5}>주문제작 옵션 상세</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
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
        <Descriptions.Item label="심지 두께">
          {(options.interlining_thickness as string) ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions bordered column={3} style={{ marginBottom: 24 }}>
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
      </Descriptions>
    </>
  );
}

export default function QuoteRequestShow() {
  const { query: queryResult } = useShow<AdminQuoteRequestDetailRowDTO>({
    resource: "admin_quote_request_detail_view",
  });
  const quote = queryResult?.data?.data;

  const { result: logsResult } = useList<QuoteRequestStatusLogDTO>({
    resource: "quote_request_status_logs",
    filters: [
      { field: "quote_request_id", operator: "eq", value: quote?.id },
    ],
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: { enabled: !!quote?.id },
  });

  const [quotedAmount, setQuotedAmount] = useState<number | null>(null);
  const [quoteConditions, setQuoteConditions] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [statusMemo, setStatusMemo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync state when data loads
  const syncedId = quote?.id;
  const [lastSyncedId, setLastSyncedId] = useState<string>();
  if (syncedId && syncedId !== lastSyncedId) {
    setLastSyncedId(syncedId);
    setQuotedAmount(quote?.quotedAmount ?? null);
    setQuoteConditions(quote?.quoteConditions ?? "");
    setAdminMemo(quote?.adminMemo ?? "");
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return;

    const doUpdate = async () => {
      setIsUpdating(true);
      try {
        const { error } = await supabase.rpc(
          "admin_update_quote_request_status",
          {
            p_quote_request_id: quote.id,
            p_new_status: newStatus,
            p_quoted_amount: quotedAmount,
            p_quote_conditions: quoteConditions || null,
            p_admin_memo: adminMemo || null,
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
        logsResult.refetch();
      } finally {
        setIsUpdating(false);
      }
    };

    if (newStatus === "종료") {
      Modal.confirm({
        title: "견적 종료",
        content: "정말 이 견적을 종료하시겠습니까?",
        okText: "종료 처리",
        cancelText: "닫기",
        okButtonProps: { danger: true },
        onOk: doUpdate,
      });
      return;
    }

    await doUpdate();
  };

  const nextStatus = quote?.status
    ? QUOTE_REQUEST_STATUS_FLOW[quote.status]
    : undefined;
  const options = (quote?.options ?? {}) as Record<string, unknown>;
  const refImages = quote?.referenceImageUrls ?? [];

  return (
    <Show>
      <Title level={5}>견적 기본 정보</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="견적번호">
          {quote?.quoteNumber}
        </Descriptions.Item>
        <Descriptions.Item label="요청일">{quote?.date}</Descriptions.Item>
        <Descriptions.Item label="상태">
          {quote?.status && (
            <Tag color={QUOTE_REQUEST_STATUS_COLORS[quote.status]}>
              {quote.status}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="수량">
          {quote?.quantity?.toLocaleString()}개
        </Descriptions.Item>
        <Descriptions.Item label="고객명">
          {quote?.customerName}
        </Descriptions.Item>
        <Descriptions.Item label="고객 연락처">
          {quote?.customerPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="고객 이메일">
          {quote?.customerEmail ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5}>담당자 연락처</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="성함">
          {quote?.contactName}
        </Descriptions.Item>
        <Descriptions.Item label="직책">
          {quote?.contactTitle || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="연락방법">
          {quote?.contactMethod
            ? CONTACT_METHOD_LABELS[quote.contactMethod]
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {quote?.contactValue}
        </Descriptions.Item>
      </Descriptions>

      <CustomOrderOptionsDetail options={options} />

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

      {quote?.additionalNotes && (
        <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="추가 요청사항">
            {quote.additionalNotes}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Title level={5}>배송지 정보</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="수령인">
          {quote?.recipientName ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {quote?.recipientPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="우편번호">
          {quote?.shippingPostalCode ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="주소" span={2}>
          {quote?.shippingAddress ?? "-"}
          {quote?.shippingAddressDetail && ` ${quote.shippingAddressDetail}`}
        </Descriptions.Item>
        <Descriptions.Item label="배송메모">
          {quote?.deliveryMemo ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="배송요청사항">
          {quote?.deliveryRequest ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5}>견적 입력</Title>
      <Space
        direction="vertical"
        style={{ width: "100%", marginBottom: 24 }}
        size="middle"
      >
        <div>
          <Text strong>견적금액 (원)</Text>
          <InputNumber
            value={quotedAmount}
            onChange={(v) => setQuotedAmount(v)}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => Number(v?.replace(/,/g, ""))}
            style={{ width: "100%", marginTop: 4 }}
            min={0}
            placeholder="견적금액을 입력해주세요"
          />
        </div>
        <div>
          <Text strong>견적 조건</Text>
          <TextArea
            value={quoteConditions}
            onChange={(e) => setQuoteConditions(e.target.value)}
            rows={3}
            placeholder="납기, 결제 조건 등"
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>관리자 메모</Text>
          <TextArea
            value={adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            rows={2}
            placeholder="내부 메모 (고객에게 노출되지 않음)"
            style={{ marginTop: 4 }}
          />
        </div>
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
        {quote?.status !== "종료" && quote?.status !== "확정" && (
          <Button
            danger
            loading={isUpdating}
            onClick={() => handleStatusChange("종료")}
          >
            종료 처리
          </Button>
        )}
      </Space>

      <Title level={5}>상태 변경 이력</Title>
      <Table
        dataSource={logsResult.data}
        rowKey="id"
        pagination={false}
        style={{ marginBottom: 24 }}
      >
        <Table.Column
          dataIndex="created_at"
          title="일시"
          render={(v: string) =>
            v ? new Date(v).toLocaleString("ko-KR") : "-"
          }
        />
        <Table.Column
          dataIndex="previous_status"
          title="이전 상태"
          render={(v: string) => (
            <Tag color={QUOTE_REQUEST_STATUS_COLORS[v]}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="new_status"
          title="변경 상태"
          render={(v: string) => (
            <Tag color={QUOTE_REQUEST_STATUS_COLORS[v]}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="memo"
          title="메모"
          render={(v: string | null) => v ?? "-"}
        />
      </Table>
    </Show>
  );
}
