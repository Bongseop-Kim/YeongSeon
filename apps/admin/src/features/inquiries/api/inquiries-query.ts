import { useState } from "react";
import { useTable } from "@refinedev/antd";
import { useShow, useInvalidate } from "@refinedev/core";
import { message } from "antd";
import type { TableProps } from "antd";
import type { AdminInquiryRowDTO } from "@yeongseon/shared";
import { toAdminInquiryListItem, toAdminInquiryDetail } from "./inquiries-mapper";
import { answerInquiry } from "./inquiries-api";
import type { AdminInquiryListItem, AdminInquiryDetail } from "../types/admin-inquiry";

// ── List ───────────────────────────────────────────────────────

export function useAdminInquiryTable() {
  const { tableProps: rawTableProps, setFilters } = useTable<AdminInquiryRowDTO>({
    resource: "inquiries",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  const tableProps = {
    ...rawTableProps,
    dataSource: (
      (rawTableProps.dataSource ?? []) as AdminInquiryRowDTO[]
    ).map(toAdminInquiryListItem),
  } as TableProps<AdminInquiryListItem>;

  return { tableProps, setFilters };
}

// ── Detail ────────────────────────────────────────────────────

export function useAdminInquiryDetail() {
  const { query } = useShow<AdminInquiryRowDTO>({
    resource: "inquiries",
    meta: { select: "*, products(id, name, image)" },
  });

  const rawData = query.data?.data;
  const detail: AdminInquiryDetail | undefined = rawData
    ? toAdminInquiryDetail(rawData)
    : undefined;

  return { detail, isLoading: query.isLoading, refetch: query.refetch };
}

// ── Answer mutation ────────────────────────────────────────────

export function useAnswerInquiry(refetchDetail?: () => void) {
  const invalidate = useInvalidate();
  const [isPending, setIsPending] = useState(false);

  const answer = async (
    inquiryId: string,
    answerText: string
  ): Promise<boolean> => {
    setIsPending(true);
    try {
      await answerInquiry({ inquiryId, answer: answerText });
      message.success("답변이 등록되었습니다.");
      invalidate({ resource: "inquiries", invalidates: ["list"] });
      refetchDetail?.();
      return true;
    } catch (err) {
      message.error(
        `답변 등록 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { answer, isPending };
}
