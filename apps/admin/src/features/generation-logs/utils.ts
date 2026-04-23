export function requestTypeLabel(v: string | null): string {
  if (v === "analysis") return "분석";
  if (v === "prep") return "보정";
  if (v === "render_standard") return "렌더(표준)";
  if (v === "render_high") return "렌더(고품질)";
  return "-";
}

export function modelColor(model: string): "blue" | "purple" {
  if (model === "openai") return "blue";
  return "purple";
}
