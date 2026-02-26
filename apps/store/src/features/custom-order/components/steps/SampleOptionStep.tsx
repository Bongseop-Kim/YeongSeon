import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SAMPLE_COST, SAMPLE_DURATION } from "@/features/custom-order/constants/SAMPLE_PRICING";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          샘플 옵션
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          본 주문 전에 샘플을 먼저 받아보시겠어요?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSampleToggle(false)}
          className={cn(
            "rounded-lg border p-4 text-left transition-colors",
            !sample
              ? "border-zinc-900 ring-1 ring-zinc-900"
              : "border-zinc-200 hover:border-zinc-400"
          )}
        >
          <p className="font-medium text-zinc-900 text-sm">아니요</p>
          <p className="text-xs text-zinc-500 mt-1">
            바로 본 주문을 진행합니다
          </p>
        </button>
        <button
          type="button"
          onClick={() => handleSampleToggle(true)}
          className={cn(
            "rounded-lg border p-4 text-left transition-colors",
            sample
              ? "border-zinc-900 ring-1 ring-zinc-900"
              : "border-zinc-200 hover:border-zinc-400"
          )}
        >
          <p className="font-medium text-zinc-900 text-sm">네, 받아볼게요</p>
          <p className="text-xs text-zinc-500 mt-1">
            샘플 확인 후 본 주문을 진행합니다
          </p>
        </button>
      </div>

      {sample && fabricProvided && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-900">봉제 샘플</p>
              <p className="text-xs text-zinc-500 mt-1">
                보내주신 원단으로 봉제 샘플을 제작합니다
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                <span>{SAMPLE_COST.sewing.toLocaleString()}원</span>
                <span>{SAMPLE_DURATION.sewing}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {sample && !fabricProvided && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm font-medium text-zinc-900">
              어떤 샘플을 받아보시겠어요?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSampleType("fabric")}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-colors",
                  sampleType === "fabric"
                    ? "border-zinc-900 ring-1 ring-zinc-900"
                    : "border-zinc-200 hover:border-zinc-400"
                )}
              >
                <p className="font-medium text-zinc-900 text-sm">원단 샘플만</p>
                <p className="text-xs text-zinc-500 mt-1">
                  원단만 제작하여 확인합니다
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                  <span>{SAMPLE_COST.fabric.toLocaleString()}원</span>
                  <span>{SAMPLE_DURATION.fabric}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSampleType("fabric_and_sewing")}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-colors",
                  sampleType === "fabric_and_sewing"
                    ? "border-zinc-900 ring-1 ring-zinc-900"
                    : "border-zinc-200 hover:border-zinc-400"
                )}
              >
                <p className="font-medium text-zinc-900 text-sm">원단 + 봉제 샘플</p>
                <p className="text-xs text-zinc-500 mt-1">
                  원단 확인 후 넥타이까지 제작합니다
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                  <span>{SAMPLE_COST.fabric_and_sewing.toLocaleString()}원</span>
                  <span>{SAMPLE_DURATION.fabric_and_sewing}</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
