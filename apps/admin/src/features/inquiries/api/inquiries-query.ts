import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  answerInquiry,
  getAdminInquiries,
  getAdminInquiryDetail,
} from "@/features/inquiries/api/inquiries-api";
import type { InquiryStatus } from "@/features/inquiries/types/admin-inquiry";

export const INQUIRY_PAGE_SIZE = 20;

export function useAdminInquiryTable(params: {
  page: number;
  status?: InquiryStatus | null;
}) {
  return useQuery({
    queryKey: ["inquiries", "list", params.page, params.status ?? null],
    queryFn: () =>
      getAdminInquiries({
        page: params.page,
        pageSize: INQUIRY_PAGE_SIZE,
        status: params.status ?? null,
      }),
  });
}

export function useAdminInquiryDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["inquiries", "detail", id],
    queryFn: () => getAdminInquiryDetail(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useAnswerInquiry(inquiryId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answer: string) =>
      answerInquiry({ inquiryId: inquiryId ?? "", answer }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inquiries", "list"] }),
        queryClient.invalidateQueries({
          queryKey: ["inquiries", "detail", inquiryId],
        }),
      ]);
    },
  });
}
