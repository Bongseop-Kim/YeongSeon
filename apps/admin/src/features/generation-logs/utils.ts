import type { GenerationRequestTypeFilter } from "@/features/generation-logs/types/admin-generation-log";

const REQUEST_TYPE_LABELS: Record<GenerationRequestTypeFilter, string> = {
  render_standard: "렌더(표준)",
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

export function isArtifactWarningMessage(msg: unknown): msg is string {
  return typeof msg === "string" && msg.startsWith("artifact_warnings:");
}
