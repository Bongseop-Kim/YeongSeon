import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminQuoteRequestDetail,
  getAdminQuoteRequests,
  getAdminQuoteRequestStatusLogs,
  updateQuoteRequestStatus,
} from "@/features/quote-requests/api/quote-requests-api";
import type {
  AdminQuoteRequestDetail,
  QuoteRequestFormValues,
} from "@/features/quote-requests/types/admin-quote-request";

export const QUOTE_REQUEST_PAGE_SIZE = 20;

const QUOTE_REQUEST_LIST_KEY = ["quote-requests", "list"] as const;
const QUOTE_REQUEST_DETAIL_KEY = ["quote-requests", "detail"] as const;
const QUOTE_REQUEST_STATUS_LOGS_KEY = [
  "quote-requests",
  "status-logs",
] as const;

function createQuoteRequestFormValues(
  detail: AdminQuoteRequestDetail | undefined,
): QuoteRequestFormValues {
  return {
    quotedAmount: detail?.quotedAmount ?? null,
    quoteConditions: detail?.quoteConditions ?? "",
    adminMemo: detail?.adminMemo ?? "",
    statusMemo: "",
  };
}

export function useAdminQuoteRequestTable(params: {
  page: number;
  quoteNumber?: string | null;
  status?: string | null;
}) {
  return useQuery({
    queryKey: [
      ...QUOTE_REQUEST_LIST_KEY,
      params.page,
      params.quoteNumber ?? null,
      params.status ?? null,
    ],
    queryFn: () =>
      getAdminQuoteRequests({
        page: params.page,
        pageSize: QUOTE_REQUEST_PAGE_SIZE,
        quoteNumber: params.quoteNumber ?? null,
        status: params.status ?? null,
      }),
  });
}

export function useAdminQuoteRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: [...QUOTE_REQUEST_DETAIL_KEY, id],
    queryFn: () => getAdminQuoteRequestDetail(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useAdminQuoteRequestStatusLogs(
  quoteRequestId: string | undefined,
) {
  return useQuery({
    queryKey: [...QUOTE_REQUEST_STATUS_LOGS_KEY, quoteRequestId],
    queryFn: () => getAdminQuoteRequestStatusLogs(quoteRequestId ?? ""),
    enabled: Boolean(quoteRequestId),
  });
}

export function useQuoteRequestFormState(
  detail: AdminQuoteRequestDetail | undefined,
) {
  const [detailId, setDetailId] = useState(detail?.id);
  const [formValues, setFormValues] = useState<QuoteRequestFormValues>(() =>
    createQuoteRequestFormValues(detail),
  );

  if (detail?.id && detail.id !== detailId) {
    setDetailId(detail.id);
    setFormValues(createQuoteRequestFormValues(detail));
  }

  return {
    formValues,
    setQuotedAmount: (quotedAmount: number | null) =>
      setFormValues((current) => ({ ...current, quotedAmount })),
    setQuoteConditions: (quoteConditions: string) =>
      setFormValues((current) => ({ ...current, quoteConditions })),
    setAdminMemo: (adminMemo: string) =>
      setFormValues((current) => ({ ...current, adminMemo })),
    setStatusMemo: (statusMemo: string) =>
      setFormValues((current) => ({ ...current, statusMemo })),
  };
}

export function useQuoteRequestStatusUpdate(
  detail: AdminQuoteRequestDetail | undefined,
  formValues: QuoteRequestFormValues,
  resetStatusMemo: () => void,
) {
  const queryClient = useQueryClient();
  const isUpdatingRef = useRef(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (newStatus: string) => {
      if (!detail) throw new Error("견적 정보를 찾을 수 없습니다.");
      return updateQuoteRequestStatus({
        quoteRequestId: detail.id,
        newStatus,
        quotedAmount: formValues.quotedAmount,
        quoteConditions: formValues.quoteConditions || null,
        adminMemo: formValues.adminMemo || null,
        memo: formValues.statusMemo || null,
      });
    },
    onMutate: () => {
      setSuccessMessage(null);
    },
    onSuccess: async (_, newStatus) => {
      resetStatusMemo();
      setSuccessMessage(`상태가 "${newStatus}"(으)로 변경되었습니다.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUOTE_REQUEST_LIST_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...QUOTE_REQUEST_DETAIL_KEY, detail?.id],
        }),
        queryClient.invalidateQueries({
          queryKey: [...QUOTE_REQUEST_STATUS_LOGS_KEY, detail?.id],
        }),
      ]);
    },
  });
  const updateStatus = async (newStatus: string): Promise<void> => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    try {
      await mutation.mutateAsync(newStatus);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  return {
    updateStatus,
    isUpdating: mutation.isPending,
    error: mutation.error,
    successMessage,
  };
}
