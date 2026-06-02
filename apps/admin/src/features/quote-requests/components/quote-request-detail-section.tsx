import { Text } from "seed-design/ui/text";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CONTACT_METHOD_LABELS,
  QUOTE_REQUEST_STATUS_FLOW,
  getDeliveryRequestLabel,
} from "@yeongseon/shared";
import { ActionButton } from "seed-design/ui/action-button";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from "seed-design/ui/alert-dialog";
import { Callout } from "seed-design/ui/callout";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { IMAGEKIT_URL_ENDPOINT } from "@/lib/imagekit";
import {
  useAdminQuoteRequestDetail,
  useAdminQuoteRequestStatusLogs,
  useQuoteRequestFormState,
  useQuoteRequestStatusUpdate,
} from "@/features/quote-requests/api/quote-requests-query";
import { CustomOrderOptionsDetail } from "@/features/quote-requests/components/custom-order-options-detail";
import type { AdminQuoteRequestStatusLog } from "@/features/quote-requests/types/admin-quote-request";
import "./quote-requests.css";

const IMAGEKIT_PATH_SEPARATOR = "/";

function quoteRequestStatusTone(status: string) {
  if (status === "확정") return "positive";
  if (status === "종료") return "critical";
  if (status === "협의중") return "warning";
  if (status === "견적발송") return "brand";
  return "neutral";
}

function formatDateTime(value: string): string {
  return value ? new Date(value).toLocaleString("ko-KR") : "-";
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="quoteRequestDetailItem">
      <Text as="dt" textStyle="t4Medium" className="quoteRequestDetailLabel">
        {label}
      </Text>
      <Text as="dd" textStyle="t4Regular" className="quoteRequestDetailValue">
        {value}
      </Text>
    </div>
  );
}

function DetailSection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <section className="quoteRequestPanel" aria-labelledby={id}>
      <div className="quoteRequestPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id={id}
          className="quoteRequestPanelTitle"
        >
          {title}
        </Text>
      </div>
      {children}
    </section>
  );
}

function normalizeAmountInput(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return Number(digits);
}

function isSafeReferenceImageUrl(url: string): boolean {
  if (!IMAGEKIT_URL_ENDPOINT) return false;

  try {
    const parsedUrl = new URL(url);
    const endpointUrl = new URL(IMAGEKIT_URL_ENDPOINT);
    const basePath = endpointUrl.pathname.endsWith(IMAGEKIT_PATH_SEPARATOR)
      ? endpointUrl.pathname
      : `${endpointUrl.pathname}${IMAGEKIT_PATH_SEPARATOR}`;

    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.origin === endpointUrl.origin &&
      parsedUrl.pathname.startsWith(basePath)
    );
  } catch {
    return false;
  }
}

interface QuoteRequestDetailSectionProps {
  quoteRequestId?: string;
}

export function QuoteRequestDetailSection({
  quoteRequestId,
}: QuoteRequestDetailSectionProps) {
  const navigate = useNavigate();
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const detailQuery = useAdminQuoteRequestDetail(quoteRequestId);
  const detail = detailQuery.data;
  const logsQuery = useAdminQuoteRequestStatusLogs(quoteRequestId);

  const {
    formValues,
    setQuotedAmount,
    setQuoteConditions,
    setAdminMemo,
    setStatusMemo,
  } = useQuoteRequestFormState(detail);

  const {
    updateStatus,
    isUpdating,
    error: updateError,
    successMessage,
  } = useQuoteRequestStatusUpdate(detail, formValues, () => setStatusMemo(""));

  const logColumns = useMemo<ColumnDef<AdminQuoteRequestStatusLog>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "일시",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: "previousStatus",
        header: "이전 상태",
        cell: ({ row }) => (
          <StatusBadge
            tone={quoteRequestStatusTone(row.original.previousStatus)}
          >
            {row.original.previousStatus}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "newStatus",
        header: "변경 상태",
        cell: ({ row }) => (
          <StatusBadge tone={quoteRequestStatusTone(row.original.newStatus)}>
            {row.original.newStatus}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "memo",
        header: "메모",
        cell: ({ row }) => row.original.memo ?? "-",
      },
    ],
    [],
  );

  if (detailQuery.isLoading) {
    return <AdminPanelSkeleton lines={5} />;
  }

  if (detailQuery.error) {
    return (
      <Callout
        tone="critical"
        title="견적 정보를 불러오지 못했습니다"
        description={detailQuery.error.message}
      />
    );
  }

  if (!detail) {
    return (
      <Callout tone="warning" description="견적 정보를 찾을 수 없습니다." />
    );
  }

  const nextStatus = QUOTE_REQUEST_STATUS_FLOW[detail.status];
  const deliveryRequestText = detail.deliveryRequest
    ? (getDeliveryRequestLabel(detail.deliveryRequest, detail.deliveryMemo) ??
      detail.deliveryRequest)
    : "-";
  const shippingAddressText = detail.shippingAddress
    ? [detail.shippingAddress, detail.shippingAddressDetail]
        .filter(Boolean)
        .join(" ")
    : "-";

  const safeReferenceImageUrls = detail.referenceImageUrls.filter(
    isSafeReferenceImageUrl,
  );

  const handleStatusChange = async (newStatus: string): Promise<boolean> => {
    try {
      await updateStatus(newStatus);
      return true;
    } catch {
      return false;
    }
  };

  const handleEndStatusChange = async (): Promise<void> => {
    const succeeded = await handleStatusChange("종료");
    if (succeeded) setEndConfirmOpen(false);
  };

  return (
    <>
      {successMessage ? (
        <Callout tone="positive" description={successMessage} role="status" />
      ) : null}
      {updateError ? (
        <Callout
          tone="critical"
          title="상태 변경 실패"
          description={updateError.message}
          role="alert"
        />
      ) : null}

      <DetailSection title="견적 기본 정보" id="quote-basic-title">
        <dl className="quoteRequestDetailGrid">
          <DetailItem label="견적번호" value={detail.quoteNumber} />
          <DetailItem label="요청일" value={detail.date} />
          <DetailItem
            label="상태"
            value={
              <StatusBadge tone={quoteRequestStatusTone(detail.status)}>
                {detail.status}
              </StatusBadge>
            }
          />
          <DetailItem
            label="수량"
            value={`${detail.quantity.toLocaleString("ko-KR")}개`}
          />
          <DetailItem
            label="고객명"
            value={
              detail.userId ? (
                <ActionButton
                  className="quoteRequestTextButton"
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={() => navigate(`/customers/show/${detail.userId}`)}
                >
                  {detail.customerName}
                </ActionButton>
              ) : (
                detail.customerName
              )
            }
          />
          <DetailItem label="고객 연락처" value={detail.customerPhone ?? "-"} />
          <DetailItem label="고객 이메일" value={detail.customerEmail ?? "-"} />
        </dl>
      </DetailSection>

      <DetailSection title="담당자 연락처" id="quote-contact-title">
        <dl className="quoteRequestDetailGrid">
          <DetailItem label="성함" value={detail.contactName} />
          <DetailItem label="상호명" value={detail.businessName || "-"} />
          <DetailItem
            label="연락방법"
            value={CONTACT_METHOD_LABELS[detail.contactMethod]}
          />
          <DetailItem label="연락처" value={detail.contactValue} />
        </dl>
      </DetailSection>

      <CustomOrderOptionsDetail
        options={detail.options}
        quantity={detail.quantity}
        quotedAmount={detail.quotedAmount}
      />

      {safeReferenceImageUrls.length > 0 ? (
        <DetailSection title="참고 이미지" id="quote-images-title">
          <ul className="quoteRequestImageList">
            {safeReferenceImageUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    className="quoteRequestReferenceImage"
                    src={url}
                    alt="견적 참고 이미지"
                    width={120}
                    height={120}
                    loading="lazy"
                  />
                </a>
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {detail.additionalNotes ? (
        <DetailSection title="추가 요청사항" id="quote-notes-title">
          <Text as="p" textStyle="t4Regular" className="quoteRequestLongText">
            {detail.additionalNotes}
          </Text>
        </DetailSection>
      ) : null}

      <DetailSection title="배송지 정보" id="quote-shipping-title">
        <dl className="quoteRequestDetailGrid">
          <DetailItem label="수령인" value={detail.recipientName ?? "-"} />
          <DetailItem label="연락처" value={detail.recipientPhone ?? "-"} />
          <DetailItem
            label="우편번호"
            value={detail.shippingPostalCode ?? "-"}
          />
          <DetailItem label="주소" value={shippingAddressText} />
          <DetailItem label="배송메모" value={detail.deliveryMemo ?? "-"} />
          <DetailItem label="배송요청사항" value={deliveryRequestText} />
        </dl>
      </DetailSection>

      <DetailSection title="견적 입력" id="quote-input-title">
        <div className="quoteRequestFormGrid adminSettingsForm">
          <TextField
            className="adminSettingsField"
            label="견적금액"
            suffix="원"
            value={formValues.quotedAmount?.toLocaleString("ko-KR") ?? ""}
            onValueChange={({ value }) =>
              setQuotedAmount(normalizeAmountInput(value))
            }
          >
            <TextFieldInput
              inputMode="numeric"
              placeholder="견적금액을 입력해주세요"
              aria-label="견적금액"
            />
          </TextField>
          <div className="adminSettingsFieldFull">
            <TextField
              label="견적 조건"
              value={formValues.quoteConditions}
              onValueChange={({ value }) => setQuoteConditions(value)}
            >
              <TextFieldTextarea placeholder="납기, 결제 조건 등" />
            </TextField>
          </div>
          <div className="adminSettingsFieldFull">
            <TextField
              label="관리자 메모"
              value={formValues.adminMemo}
              onValueChange={({ value }) => setAdminMemo(value)}
            >
              <TextFieldTextarea placeholder="내부 메모 (고객에게 노출되지 않음)" />
            </TextField>
          </div>
          <div className="adminSettingsFieldFull">
            <TextField
              label="상태 변경 메모"
              value={formValues.statusMemo}
              onValueChange={({ value }) => setStatusMemo(value)}
            >
              <TextFieldTextarea placeholder="상태 변경 사유 (이력에 기록됨)" />
            </TextField>
          </div>
        </div>
        <div className="quoteRequestActions adminSettingsActionRow">
          {nextStatus ? (
            <ActionButton
              type="button"
              loading={isUpdating}
              disabled={isUpdating}
              onClick={() => void handleStatusChange(nextStatus)}
            >
              {nextStatus} 으로 변경
            </ActionButton>
          ) : null}
          {detail.status !== "종료" && detail.status !== "확정" ? (
            <ActionButton
              type="button"
              variant="criticalSolid"
              loading={isUpdating}
              disabled={isUpdating}
              onClick={() => setEndConfirmOpen(true)}
            >
              종료 처리
            </ActionButton>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="상태 변경 이력" id="quote-log-title">
        {logsQuery.error ? (
          <Callout tone="critical" description={logsQuery.error.message} />
        ) : null}
        <AdminDataTable
          data={logsQuery.data ?? []}
          columns={logColumns}
          getRowId={(row) => row.id}
          emptyText="상태 변경 이력이 없습니다."
          minWidth={640}
          isLoading={logsQuery.isFetching}
        />
      </DetailSection>

      <AlertDialogRoot open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent layerIndex={60}>
          <AlertDialogHeader>
            <AlertDialogTitle>견적 종료</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 견적을 종료하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              variant="neutralWeak"
              onClick={() => setEndConfirmOpen(false)}
            >
              닫기
            </AlertDialogAction>
            <ActionButton
              type="button"
              variant="criticalSolid"
              loading={isUpdating}
              disabled={isUpdating}
              onClick={() => {
                void handleEndStatusChange();
              }}
            >
              종료 처리
            </ActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </>
  );
}
