import type { GenerationRequestTypeFilter } from "@/features/generation-logs/types/admin-generation-log";

const REQUEST_TYPE_LABELS: Record<GenerationRequestTypeFilter, string> = {
  render_standard: "렌더(표준)",
};

export function requestTypeLabel(v: string | null): string {
  return REQUEST_TYPE_LABELS[v as GenerationRequestTypeFilter] ?? "-";
}
