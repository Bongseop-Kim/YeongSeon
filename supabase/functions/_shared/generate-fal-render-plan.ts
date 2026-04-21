import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";

export type ProcessedReference = {
  base64: string;
  mimeType: string;
};

export type FalRenderPlan = {
  shouldUpscaleReference: boolean;
  isA2Scenario: boolean;
  renderBackend: "ip_adapter" | "img2img";
};

export function planFalRender(
  payload: Pick<
    GenerateDesignRequest,
    "referenceImageBase64" | "ciImageBase64"
  >,
  processedReference: ProcessedReference | null,
): FalRenderPlan {
  const shouldUpscaleReference =
    !!payload.referenceImageBase64 && !payload.ciImageBase64;
  const isA2Scenario = processedReference !== null;

  return {
    shouldUpscaleReference,
    isA2Scenario,
    renderBackend: isA2Scenario ? "ip_adapter" : "img2img",
  };
}
