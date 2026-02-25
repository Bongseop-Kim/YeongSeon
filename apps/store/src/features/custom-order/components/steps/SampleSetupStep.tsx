import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SAMPLE_COST, SAMPLE_DURATION } from "@/features/custom-order/constants/SAMPLE_PRICING";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

export const SampleSetupStep = () => {
  const { watch, setValue } = useFormContext<QuoteOrderOptions>();
  const fabricProvided = watch("fabricProvided");
  const sampleType = watch("sampleType");

  const handleFabricProvided = (provided: boolean) => {
    setValue("fabricProvided", provided);
    if (provided) {
      setValue("sampleType", "sewing");
      setValue("fabricType", null);
      setValue("designType", null);
    } else {
      setValue("sampleType", null);
    }
  };

  const handleSampleScope = (scope: "fabric" | "fabric_and_sewing") => {
    setValue("sampleType", scope);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          샘플 설정
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          어떤 샘플을 제작할지 선택해주세요
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm font-medium text-zinc-900">
            원단을 직접 보내주시나요?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleFabricProvided(true)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                fabricProvided
                  ? "border-zinc-900 ring-1 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-400"
              )}
            >
              <p className="font-medium text-zinc-900 text-sm">네</p>
              <p className="text-xs text-zinc-500 mt-1">
                원단을 보내주시면 봉제만 진행합니다
              </p>
            </button>
            <button
              type="button"
              onClick={() => handleFabricProvided(false)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                !fabricProvided
                  ? "border-zinc-900 ring-1 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-400"
              )}
            >
              <p className="font-medium text-zinc-900 text-sm">아니요</p>
              <p className="text-xs text-zinc-500 mt-1">
                원단도 함께 의뢰합니다
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {fabricProvided && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-900">봉제 샘플</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                <span>{SAMPLE_COST.sewing.toLocaleString()}원</span>
                <span>{SAMPLE_DURATION.sewing}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!fabricProvided && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm font-medium text-zinc-900">
              어떤 샘플을 만들까요?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSampleScope("fabric")}
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
                onClick={() => handleSampleScope("fabric_and_sewing")}
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
