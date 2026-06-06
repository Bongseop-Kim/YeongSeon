import type { SampleOrderPaymentState } from "@/shared/lib/custom-payment-state";

type SampleOrderOptions = SampleOrderPaymentState["options"];
type SampleOrderType = SampleOrderPaymentState["sampleType"];

export const getSampleOrderTypeLabel = (
  sampleType: SampleOrderType,
): string => {
  if (sampleType === "sewing") return "봉제 샘플";
  if (sampleType === "fabric") return "원단 샘플";
  return "원단 + 봉제 샘플";
};

export const getSampleOrderFabricLabel = (
  options: Pick<SampleOrderOptions, "fabricType" | "designType">,
): string => {
  if (!options.fabricType || !options.designType) return "봉제 전용";

  const fabricLabel = options.fabricType === "SILK" ? "실크" : "폴리";
  const designLabel = options.designType === "YARN_DYED" ? "선염" : "납염";

  return `${fabricLabel} · ${designLabel}`;
};
