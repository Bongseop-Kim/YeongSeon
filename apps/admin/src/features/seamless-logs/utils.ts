import type {
  SeamlessInputTypeFilter,
  SeamlessStatusFilter,
} from "@/features/seamless-logs/types/admin-seamless-log";

const INPUT_TYPE_LABELS: Record<SeamlessInputTypeFilter, string> = {
  intent: "intent",
  prompt: "prompt",
  reference_image: "reference image",
};

const STATUS_LABELS: Record<SeamlessStatusFilter, string> = {
  success: "성공",
  partial: "부분 성공",
  error: "에러",
};

export function inputTypeLabel(v: string | null): string {
  return INPUT_TYPE_LABELS[v as SeamlessInputTypeFilter] ?? "-";
}

export function statusLabel(v: string | null): string {
  return STATUS_LABELS[v as SeamlessStatusFilter] ?? "-";
}

export function statusTone(
  status: string | null,
): "positive" | "warning" | "critical" | "neutral" {
  if (status === "success") return "positive";
  if (status === "partial") return "warning";
  if (status === "error") return "critical";
  return "neutral";
}
