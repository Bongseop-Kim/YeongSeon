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
  Spin,
  Alert,
} from "antd";
import { useNavigation } from "@refinedev/core";
import {
  QUOTE_REQUEST_STATUS_FLOW,
  QUOTE_REQUEST_STATUS_COLORS,
  CONTACT_METHOD_LABELS,
} from "@yeongseon/shared";
import {
  useAdminQuoteRequestDetail,
  useAdminQuoteRequestStatusLogs,
  useQuoteRequestFormState,
  useQuoteRequestStatusUpdate,
} from "../api/quote-requests-query";
import { CustomOrderOptionsDetail } from "./custom-order-options-detail";

const { Title, Text } = Typography;
const { TextArea } = Input;

export function QuoteRequestDetailSection() {
  const { show } = useNavigation();
  const { detail, refetch, isLoading, error } = useAdminQuoteRequestDetail();
  const { logs } = useAdminQuoteRequestStatusLogs(detail?.id);

  const {
    formValues,
    setQuotedAmount,
    setQuoteConditions,
    setAdminMemo,
    setStatusMemo,
  } = useQuoteRequestFormState(detail);

  const { updateStatus, isUpdating } = useQuoteRequestStatusUpdate(
    detail,
    formValues,
    refetch,
    () => setStatusMemo("")
  );

  if (isLoading) return <Spin style={{ display: "block", marginTop: 48 }} />;
  if (error) return <Alert type="error" message={`데이터를 불러오는 데 실패했습니다: ${error instanceof Error ? error.message : String(error)}`} />;
  if (!detail) return <Alert type="warning" message="견적 정보를 찾을 수 없습니다." />;

  const nextStatus = QUOTE_REQUEST_STATUS_FLOW[detail.status];

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "종료") {
      Modal.confirm({
        title: "견적 종료",
        content: "정말 이 견적을 종료하시겠습니까?",
        okText: "종료 처리",
        cancelText: "닫기",
        okButtonProps: { danger: true },
        onOk: () => updateStatus(newStatus),
      });
      return;
    }
    updateStatus(newStatus);
  };

  return (
    <>
      <Title level={5}>견적 기본 정보</Title>
      <Descriptions
        bordered
        column={{ xs: 1, sm: 1, md: 2 }}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="견적번호">
          {detail.quoteNumber}
        </Descriptions.Item>
        <Descriptions.Item label="요청일">{detail.date}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <Tag color={QUOTE_REQUEST_STATUS_COLORS[detail.status]}>
            {detail.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="수량">
          {detail.quantity?.toLocaleString()}개
        </Descriptions.Item>
        <Descriptions.Item label="고객명">
          {detail.userId ? (
            <a
              onClick={() => show("profiles", detail.userId)}
              style={{ cursor: "pointer" }}
            >
              {detail.customerName}
            </a>
          ) : (
            detail.customerName
          )}
        </Descriptions.Item>
        <Descriptions.Item label="고객 연락처">
          {detail.customerPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="고객 이메일">
          {detail.customerEmail ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5}>담당자 연락처</Title>
      <Descriptions
        bordered
        column={{ xs: 1, sm: 1, md: 2 }}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="성함">{detail.contactName}</Descriptions.Item>
        <Descriptions.Item label="직책">
          {detail.contactTitle || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="연락방법">
          {CONTACT_METHOD_LABELS[detail.contactMethod]}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {detail.contactValue}
        </Descriptions.Item>
      </Descriptions>

      <CustomOrderOptionsDetail options={detail.options} />

      {detail.referenceImageUrls.length > 0 && (
        <>
          <Title level={5}>참고 이미지</Title>
          <Image.PreviewGroup>
            <Space wrap style={{ marginBottom: 24 }}>
              {detail.referenceImageUrls.map((url, idx) => (
                <Image key={idx} width={120} src={url} />
              ))}
            </Space>
          </Image.PreviewGroup>
        </>
      )}

      {detail.additionalNotes && (
        <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="추가 요청사항">
            {detail.additionalNotes}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Title level={5}>배송지 정보</Title>
      <Descriptions
        bordered
        column={{ xs: 1, sm: 1, md: 2 }}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="수령인">
          {detail.recipientName ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {detail.recipientPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="우편번호">
          {detail.shippingPostalCode ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="주소" span={2}>
          {detail.shippingAddress ?? "-"}
          {detail.shippingAddressDetail && ` ${detail.shippingAddressDetail}`}
        </Descriptions.Item>
        <Descriptions.Item label="배송메모">
          {detail.deliveryMemo ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="배송요청사항">
          {detail.deliveryRequest ?? "-"}
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
            value={formValues.quotedAmount}
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
            value={formValues.quoteConditions}
            onChange={(e) => setQuoteConditions(e.target.value)}
            rows={3}
            placeholder="납기, 결제 조건 등"
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>관리자 메모</Text>
          <TextArea
            value={formValues.adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            rows={2}
            placeholder="내부 메모 (고객에게 노출되지 않음)"
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>상태 변경 메모</Text>
          <TextArea
            value={formValues.statusMemo}
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
        {detail.status !== "종료" && detail.status !== "확정" && (
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
        dataSource={logs}
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
            <Tag color={QUOTE_REQUEST_STATUS_COLORS[v]}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="newStatus"
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
    </>
  );
}
