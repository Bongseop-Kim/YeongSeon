import { useState, useEffect, useRef } from "react";
import { useTable } from "@refinedev/antd";
import { useShow, useList, useInvalidate, useParsed } from "@refinedev/core";
import { message } from "antd";
import type { TableProps } from "antd";
import type {
  AdminQuoteRequestListRowDTO,
  AdminQuoteRequestDetailRowDTO,
  QuoteRequestStatusLogDTO,
} from "@yeongseon/shared";
import {
  toAdminQuoteRequestListItem,
  toAdminQuoteRequestDetail,
  toAdminQuoteRequestStatusLog,
} from "@/features/quote-requests/api/quote-requests-mapper";
import { updateQuoteRequestStatus } from "@/features/quote-requests/api/quote-requests-api";
import type {
  AdminQuoteRequestListItem,
  AdminQuoteRequestDetail,
  AdminQuoteRequestStatusLog,
  QuoteRequestFormValues,
} from "@/features/quote-requests/types/admin-quote-request";

// ── List ───────────────────────────────────────────────────────

export function useAdminQuoteRequestTable() {
  const { tableProps: rawTableProps, setFilters } =
    useTable<AdminQuoteRequestListRowDTO>({
      resource: "admin_quote_request_list_view",
      sorters: { initial: [{ field: "createdAt", order: "desc" }] },
      syncWithLocation: true,
    });

  const tableProps = {
    ...rawTableProps,
    dataSource: (
      (rawTableProps.dataSource ?? []) as AdminQuoteRequestListRowDTO[]
    ).map(toAdminQuoteRequestListItem),
  } as TableProps<AdminQuoteRequestListItem>;

  return { tableProps, setFilters };
}

// ── Detail ────────────────────────────────────────────────────

export function useAdminQuoteRequestDetail() {
  const { id } = useParsed();
  const { query } = useShow<AdminQuoteRequestDetailRowDTO>({
    resource: "admin_quote_request_detail_view",
    id,
  });

  const rawData = query.data?.data;
  const detail: AdminQuoteRequestDetail | undefined = rawData
    ? toAdminQuoteRequestDetail(rawData)
    : undefined;

  return {
    detail,
    refetch: query.refetch,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ── Status logs ────────────────────────────────────────────────

export function useAdminQuoteRequestStatusLogs(
  quoteRequestId: string | undefined,
) {
  const { result } = useList<QuoteRequestStatusLogDTO>({
    resource: "admin_quote_request_status_log_view",
    filters: [
      { field: "quoteRequestId", operator: "eq", value: quoteRequestId },
    ],
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!quoteRequestId },
  });

  const logs: AdminQuoteRequestStatusLog[] = (result.data ?? []).map(
    toAdminQuoteRequestStatusLog,
  );

  return { logs };
}

// ── Form state ─────────────────────────────────────────────────

export function useQuoteRequestFormState(
  detail: AdminQuoteRequestDetail | undefined,
) {
  const [quotedAmount, setQuotedAmount] = useState<number | null>(null);
  const [quoteConditions, setQuoteConditions] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [statusMemo, setStatusMemo] = useState("");
  const prevIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!detail) return;
    if (detail.id === prevIdRef.current) return;
    prevIdRef.current = detail.id;
    setQuotedAmount(detail.quotedAmount ?? null);
    setQuoteConditions(detail.quoteConditions ?? "");
    setAdminMemo(detail.adminMemo ?? "");
    setStatusMemo("");
  }, [detail]);

  const formValues: QuoteRequestFormValues = {
    quotedAmount,
    quoteConditions,
    adminMemo,
    statusMemo,
  };

  return {
    formValues,
    setQuotedAmount,
    setQuoteConditions,
    setAdminMemo,
    setStatusMemo,
  };
}

// ── Status update ──────────────────────────────────────────────

export function useQuoteRequestStatusUpdate(
  detail: AdminQuoteRequestDetail | undefined,
  formValues: QuoteRequestFormValues,
  refetch: () => void,
  resetStatusMemo: () => void,
) {
  const invalidate = useInvalidate();
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  const updateStatus = async (newStatus: string) => {
    if (!detail || isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setIsUpdating(true);
    try {
      await updateQuoteRequestStatus({
        quoteRequestId: detail.id,
        newStatus,
        quotedAmount: formValues.quotedAmount,
        quoteConditions: formValues.quoteConditions || null,
        adminMemo: formValues.adminMemo || null,
        memo: formValues.statusMemo || null,
      });
      message.success(`상태가 "${newStatus}"(으)로 변경되었습니다.`);
      resetStatusMemo();
      refetch();
      invalidate({
        resource: "admin_quote_request_status_log_view",
        invalidates: ["list"],
      });
    } catch (err) {
      message.error(
        `상태 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
      );
    } finally {
      isUpdatingRef.current = false;
      setIsUpdating(false);
    }
  };

  return { updateStatus, isUpdating };
}
