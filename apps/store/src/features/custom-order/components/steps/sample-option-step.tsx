import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SAMPLE_COST, SAMPLE_DURATION } from "@/features/custom-order/constants/SAMPLE_PRICING";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import { StepLayout } from "./step-layout";

export const SampleOptionStep = () => {
  const { watch, setValue } = useFormContext<QuoteOrderOptions>();
  const sample = watch("sample");
  const fabricProvided = watch("fabricProvided");
  const sampleType = watch("sampleType");

  // fabricProvided 변경 시 sampleType 동기화
  useEffect(() => {
    if (!sample) return;
    if (fabricProvided) {
      setValue("sampleType", "sewing");
    } else if (sampleType === "sewing") {
      setValue("sampleType", null);
    }
  }, [fabricProvided, sample, sampleType, setValue]);

  const handleSampleToggle = (wantsSample: boolean) => {
    setValue("sample", wantsSample);
    if (!wantsSample) {
      setValue("sampleType", null);
    } else if (fabricProvided) {
      setValue("sampleType", "sewing");
    }
  };

  const handleSampleType = (type: "fabric" | "fabric_and_sewing") => {
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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleSampleToggle(false)}
          className={cn(
            "flex h-[88px] flex-col justify-start px-3.5 py-3",
            !sample ? "" : ""
          )}
        >
          <p className="text-sm font-semibold text-zinc-900">아니요</p>
          <p className="mt-1 text-[11px] text-zinc-500">바로 본 주문 진행</p>
        </button>
        <button
          type="button"
          onClick={() => handleSampleToggle(true)}
          className={cn(
            "flex h-[88px] flex-col justify-start px-3.5 py-3",
            sample ? '' : ''
          )}
        >
          <p className="text-sm font-semibold text-zinc-900">네, 샘플 필요</p>
          <p className="mt-1 text-[11px] text-zinc-500">확인 후 본생산</p>
        </button>
      </div>

      {sample && fabricProvided && (
        <Card>
          <CardContent className="space-y-2 px-4 py-4">
            <p>샘플 유형</p>
            <p className="text-sm font-medium text-zinc-900">봉제 샘플</p>
            <p className="text-xs text-zinc-500">
              보내주신 원단으로 봉제 샘플을 제작합니다
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>{SAMPLE_COST.sewing.toLocaleString()}원</span>
              <span>{SAMPLE_DURATION.sewing}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {sample && !fabricProvided && (
        <Card>
          <CardContent className="space-y-2 px-4 py-4">
            <p>샘플 유형</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSampleType("fabric")}
                className={cn(
                  "w-full rounded-xl px-3 py-3",
                  sampleType === "fabric"
                    ? '' : ''
                )}
              >
                <p className="text-sm font-medium text-zinc-900">원단 샘플만</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  원단만 제작하여 확인합니다
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>{SAMPLE_COST.fabric.toLocaleString()}원</span>
                  <span>{SAMPLE_DURATION.fabric}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSampleType("fabric_and_sewing")}
                className={cn(
                  "w-full rounded-xl px-3 py-3",
                  sampleType === "fabric_and_sewing"
                    ? '' : ''
                )}
              >
                <p className="text-sm font-medium text-zinc-900">원단 + 봉제 샘플</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  원단 확인 후 넥타이까지 제작합니다
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>{SAMPLE_COST.fabric_and_sewing.toLocaleString()}원</span>
                  <span>{SAMPLE_DURATION.fabric_and_sewing}</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </StepLayout>
  );
};
