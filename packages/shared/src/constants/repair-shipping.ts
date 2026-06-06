/** 송장번호 없이 수선품 발송을 접수할 때 선택하는 사유 (DB check 제약과 동일) */
export const REPAIR_NO_TRACKING_REASONS = [
  { value: "quick", label: "퀵서비스로 보냈어요" },
  { value: "overseas", label: "해외 배송으로 보냈어요" },
  { value: "lost", label: "송장을 분실했어요" },
] as const;

export type RepairNoTrackingReason =
  (typeof REPAIR_NO_TRACKING_REASONS)[number]["value"];

export const REPAIR_NO_TRACKING_REASON_LABELS: Record<
  RepairNoTrackingReason,
  string
> = {
  quick: "퀵서비스 발송",
  overseas: "해외 배송",
  lost: "송장 분실",
};

export const getRepairNoTrackingReasonLabel = (
  reason: string | null | undefined,
): string =>
  REPAIR_NO_TRACKING_REASON_LABELS[reason as RepairNoTrackingReason] ??
  (reason || "-");
