import type { GenerationRequestTypeFilter } from "@/features/generation-logs/types/admin-generation-log";

const REQUEST_TYPE_LABELS: Record<GenerationRequestTypeFilter, string> = {
  analysis: "분석",
  prep: "보정",
  render_standard: "렌더(표준)",
  render_high: "렌더(고품질)",
};

const MODEL_COLORS: Record<string, "blue" | "purple"> = {
  openai: "blue",
};

export function requestTypeLabel(v: string | null): string {
  return REQUEST_TYPE_LABELS[v as GenerationRequestTypeFilter] ?? "-";
}

export function modelColor(model: string): "blue" | "purple" {
  return MODEL_COLORS[model] ?? "purple";
}
