import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { RadioCard } from "@/components/composite/radio-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { SAMPLE_DURATION } from "@/features/custom-order/constants/SAMPLE_PRICING";
import { usePricingConfig } from "@/features/custom-order/api/pricing-query";
import { calculateSampleCost } from "@/features/custom-order/utils/pricing";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import { StepLayout } from "./step-layout";

const SAMPLE_TYPE_OPTIONS = [
  {
    value: "sewing" as const,
    label: "봉제 샘플",
    description: "봉제만 샘플로 제작합니다",
  },
  {
    value: "fabric_and_sewing" as const,
    label: "봉제 + 원단 샘플",
    description: "원단 확인 후 넥타이까지 제작합니다",
  },
  {
    value: "fabric" as const,
    label: "원단 샘플",
    description: "원단만 제작하여 확인합니다",
  },
];

export const SampleOptionStep = () => {
  const { watch, setValue } = useFormContext<QuoteOrderOptions>();
  const { data: pricingConfig } = usePricingConfig();
  const sample = watch("sample");
  const fabricProvided = watch("fabricProvided");
  const sampleType = watch("sampleType");

  if (!pricingConfig) {
    return <div className="text-sm text-gray-400">로딩중...</div>;
  }

  // fabricProvided=true 시 sewing으로 자동 고정
  useEffect(() => {
    if (!sample) return;
    if (fabricProvided) {
      setValue("sampleType", "sewing");
    }
  }, [fabricProvided, sample, setValue]);

  const handleSampleToggle = (wantsSample: boolean) => {
    setValue("sample", wantsSample);
    if (!wantsSample) {
      setValue("sampleType", null);
    } else if (fabricProvided) {
      setValue("sampleType", "sewing");
    }
  };

  const handleSampleType = (
    type: "sewing" | "fabric" | "fabric_and_sewing",
  ) => {
    setValue("sampleType", type);
  };

  return (
    <StepLayout
      guideTitle="샘플 전략"
      guideItems={[
        "일정이 촉박하면 샘플 생략",
        "품질 확인이 중요하면 샘플 권장",
        "원단+봉제 샘플은 비용 증가",
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>샘플 여부</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={sample ? "yes" : "no"}
            onValueChange={(v) => handleSampleToggle(v === "yes")}
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <RadioCard
                value="no"
                id="sample-toggle-no"
                selected={!sample}
              >
                <CardHeader>
                  <CardTitle>아니요</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-zinc-500">바로 본 주문 진행</p>
                </CardContent>
              </RadioCard>
              <RadioCard
                value="yes"
                id="sample-toggle-yes"
                selected={sample}
              >
                <CardHeader>
                  <CardTitle>네, 샘플 필요</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-zinc-500">확인 후 본생산</p>
                </CardContent>
              </RadioCard>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {sample && (
        <Card>
          <CardHeader>
            <CardTitle>샘플 유형</CardTitle>
          </CardHeader>
          <CardContent>
            {fabricProvided ? (
              <Card className="border-zinc-900 bg-zinc-50">
                <CardHeader>
                  <CardTitle>봉제 샘플</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-zinc-500">
                    보내주신 원단으로 봉제 샘플을 제작합니다
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{calculateSampleCost("sewing", pricingConfig).toLocaleString()}원</span>
                    <span>{SAMPLE_DURATION.sewing}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <RadioGroup
                value={sampleType ?? ""}
                onValueChange={(v) =>
                  handleSampleType(
                    v as "sewing" | "fabric" | "fabric_and_sewing",
                  )
                }
              >
                <div className="space-y-2">
                  {SAMPLE_TYPE_OPTIONS.map((option) => (
                    <RadioCard
                      key={option.value}
                      value={option.value}
                      id={`sample-type-${option.value}`}
                      selected={sampleType === option.value}
                    >
                      <CardHeader>
                        <CardTitle>{option.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-zinc-500">
                          {option.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                          <span>
                            {calculateSampleCost(option.value, pricingConfig).toLocaleString()}원
                          </span>
                          <span>{SAMPLE_DURATION[option.value]}</span>
                        </div>
                      </CardContent>
                    </RadioCard>
                  ))}
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>
      )}
    </StepLayout>
  );
};
