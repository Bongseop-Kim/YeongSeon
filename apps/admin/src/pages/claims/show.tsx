import { Show } from "@refinedev/antd";
import { useShow, useList, useUpdate, useInvalidate, useNavigation } from "@refinedev/core";
import {
  Descriptions,
  Tag,
  Table,
  Button,
  Space,
  Modal,
  Typography,
  Input,
  Select,
  message,
} from "antd";
import { useState, useEffect, useRef } from "react";
import type { AdminClaimListRowDTO, ClaimStatusLogDTO } from "@yeongseon/shared";
import {
  CLAIM_STATUS_FLOW,
  CLAIM_STATUS_COLORS,
  CLAIM_TYPE_LABELS,
  CLAIM_REASON_LABELS,
  COURIER_COMPANY_NAMES,
  buildTrackingUrl,
  ORDER_STATUS_COLORS,
} from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ClaimShow() {
  const { show } = useNavigation();
  const { query: queryResult } = useShow<AdminClaimListRowDTO>({
    resource: "admin_claim_list_view",
  });
  const claim = queryResult?.data?.data;

  const { result: logsResult } = useList<ClaimStatusLogDTO>({
    resource: "admin_claim_status_log_view",
    filters: [
      { field: "claimId", operator: "eq", value: claim?.id },
    ],
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!claim?.id },
  });

  const { mutate: updateClaim, mutation: updateMutation } = useUpdate();
  const invalidate = useInvalidate();

  // Return tracking state
  const [returnCourier, setReturnCourier] = useState("");
  const [returnTracking, setReturnTracking] = useState("");
  // Resend tracking state
  const [resendCourier, setResendCourier] = useState("");
  const [resendTracking, setResendTracking] = useState("");
  const [statusMemo, setStatusMemo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (claim && !initializedRef.current) {
      setReturnCourier(claim.returnCourierCompany ?? "");
      setReturnTracking(claim.returnTrackingNumber ?? "");
      setResendCourier(claim.resendCourierCompany ?? "");
      setResendTracking(claim.resendTrackingNumber ?? "");
      initializedRef.current = true;
    }
  }, [claim]);

  const handleStatusChange = async (newStatus: string) => {
    if (!claim) return;

    const doUpdate = async () => {
      setIsUpdating(true);
      try {
        const { error } = await supabase.rpc(
          "admin_update_claim_status",
          {
            p_claim_id: claim.id,
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
          resource: "admin_claim_status_log_view",
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

    if (newStatus === "거부") {
      Modal.confirm({
        title: "클레임 거부",
        content: "정말 이 클레임을 거부하시겠습니까?",
        okText: "거부",
        cancelText: "닫기",
        okButtonProps: { danger: true },
        onOk: doUpdate,
      });
      return;
    }

    await doUpdate();
  };

  const handleSaveReturnTracking = () => {
    if (!claim) return;
    updateClaim(
      {
        resource: "claims",
        id: claim.id,
        values: {
          return_courier_company: returnCourier || null,
          return_tracking_number: returnTracking || null,
        },
      },
      {
        onSuccess: () => message.success("수거 배송 정보가 저장되었습니다."),
        onError: () => message.error("수거 배송 정보 저장에 실패했습니다."),
      },
    );
  };

  const handleSaveResendTracking = () => {
    if (!claim) return;
    updateClaim(
      {
        resource: "claims",
        id: claim.id,
        values: {
          resend_courier_company: resendCourier || null,
          resend_tracking_number: resendTracking || null,
        },
      },
      {
        onSuccess: () => message.success("재발송 배송 정보가 저장되었습니다."),
        onError: () => message.error("재발송 배송 정보 저장에 실패했습니다."),
      },
    );
  };

  const claimType = claim?.type;
  const statusFlow = claimType ? CLAIM_STATUS_FLOW[claimType] : undefined;
  const nextStatus =
    claim?.status && statusFlow ? statusFlow[claim.status] : undefined;

  const showReturnSection =
    claimType === "return" || claimType === "exchange";
  const showResendSection = claimType === "exchange";

  const returnTrackingUrl =
    returnCourier && returnTracking
      ? buildTrackingUrl(returnCourier, returnTracking)
      : null;
  const resendTrackingUrl =
    resendCourier && resendTracking
      ? buildTrackingUrl(resendCourier, resendTracking)
      : null;
  const orderTrackingUrl =
    claim?.orderCourierCompany && claim?.orderTrackingNumber
      ? buildTrackingUrl(claim.orderCourierCompany, claim.orderTrackingNumber)
      : null;

  const courierOptions = COURIER_COMPANY_NAMES.map((name) => ({
    label: name,
    value: name,
  }));

  return (
    <Show>
      {/* Section 1: Claim Info */}
      <Title level={5}>클레임 정보</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="클레임번호">
          {claim?.claimNumber}
        </Descriptions.Item>
        <Descriptions.Item label="접수일">{claim?.date}</Descriptions.Item>
        <Descriptions.Item label="유형">
          {claim?.type ? CLAIM_TYPE_LABELS[claim.type] : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="상태">
          {claim?.status && (
            <Tag color={CLAIM_STATUS_COLORS[claim.status]}>{claim.status}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="고객명">
          {claim?.userId ? (
            <a
              onClick={() => show("profiles", claim.userId)}
              style={{ cursor: "pointer" }}
            >
              {claim.customerName}
            </a>
          ) : (
            claim?.customerName
          )}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {claim?.customerPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="주문번호">
          {claim?.orderId ? (
            <a
              onClick={() => show("admin_order_list_view", claim.orderId)}
              style={{ cursor: "pointer" }}
            >
              {claim.orderNumber}
            </a>
          ) : (
            claim?.orderNumber
          )}
        </Descriptions.Item>
        <Descriptions.Item label="상품명">
          {claim?.productName ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="사유">
          {claim?.reason
            ? CLAIM_REASON_LABELS[claim.reason] ?? claim.reason
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="수량">
          {claim?.claimQuantity}
        </Descriptions.Item>
        <Descriptions.Item label="상세설명" span={2}>
          {claim?.description ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      {/* Section 2: Order Shipping Info (read-only) */}
      <Title level={5}>주문 배송 정보</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="주문상태">
          {claim?.orderStatus ? (
            <Tag color={ORDER_STATUS_COLORS[claim.orderStatus]}>
              {claim.orderStatus}
            </Tag>
          ) : (
            "-"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="택배사">
          {claim?.orderCourierCompany ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="송장번호">
          <Space>
            {claim?.orderTrackingNumber ?? "-"}
            {orderTrackingUrl && (
              <Button
                size="small"
                href={orderTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                배송추적
              </Button>
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="발송일">
          {claim?.orderShippedAt
            ? new Date(claim.orderShippedAt).toLocaleString("ko-KR")
            : "-"}
        </Descriptions.Item>
      </Descriptions>

      {/* Section 3: Return (수거) Info — return/exchange only */}
      {showReturnSection && (
        <>
          <Title level={5}>수거 정보</Title>
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: 24 }}
          >
            <Space wrap>
              <Select
                value={returnCourier || undefined}
                placeholder="택배사 선택"
                onChange={(value) => setReturnCourier(value ?? "")}
                style={{ width: 180 }}
                options={courierOptions}
                allowClear
              />
              <Input
                value={returnTracking}
                placeholder="송장번호"
                onChange={(e) => setReturnTracking(e.target.value)}
                style={{ width: 220 }}
              />
              <Button
                type="primary"
                onClick={handleSaveReturnTracking}
                loading={updateMutation.isPending}
              >
                저장
              </Button>
              {returnTrackingUrl && (
                <Button
                  href={returnTrackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  수거추적
                </Button>
              )}
            </Space>
          </Space>
        </>
      )}

      {/* Section 4: Resend (재발송) Info — exchange only */}
      {showResendSection && (
        <>
          <Title level={5}>재발송 정보</Title>
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: 24 }}
          >
            <Space wrap>
              <Select
                value={resendCourier || undefined}
                placeholder="택배사 선택"
                onChange={(value) => setResendCourier(value ?? "")}
                style={{ width: 180 }}
                options={courierOptions}
                allowClear
              />
              <Input
                value={resendTracking}
                placeholder="송장번호"
                onChange={(e) => setResendTracking(e.target.value)}
                style={{ width: 220 }}
              />
              <Button
                type="primary"
                onClick={handleSaveResendTracking}
                loading={updateMutation.isPending}
              >
                저장
              </Button>
              {resendTrackingUrl && (
                <Button
                  href={resendTrackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  배송추적
                </Button>
              )}
            </Space>
          </Space>
        </>
      )}

      {/* Status Memo + Action Buttons */}
      <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
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

      <Space style={{ marginTop: 12, marginBottom: 24 }}>
        {nextStatus && (
          <Button
            type="primary"
            loading={isUpdating}
            onClick={() => handleStatusChange(nextStatus)}
          >
            {nextStatus} 으로 변경
          </Button>
        )}
        {claim?.status !== "거부" && claim?.status !== "완료" && (
          <Button
            danger
            loading={isUpdating}
            onClick={() => handleStatusChange("거부")}
          >
            거부
          </Button>
        )}
      </Space>

      <Title level={5}>상태 변경 이력</Title>
      <Table
        dataSource={logsResult?.data}
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
            <Tag color={CLAIM_STATUS_COLORS[v]}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="newStatus"
          title="변경 상태"
          render={(v: string) => (
            <Tag color={CLAIM_STATUS_COLORS[v]}>{v}</Tag>
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
