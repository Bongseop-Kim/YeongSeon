import { useEffect } from "react";
import { useFormContext, type UseFormSetValue } from "react-hook-form";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { SewingStyle } from "@/features/custom-order/types/wizard";

const SEWING_STYLES: {
  value: SewingStyle;
  label: string;
  description: string;
  dimpleOnly?: boolean;
}[] = [
  {
    value: "normal",
    label: "일반",
    description: "가장 보편적인 제작 방식이에요",
  },
  {
    value: "dimple",
    label: "딤플",
    description: "매듭 아래 자연스러운 주름",
    dimpleOnly: true,
  },
  {
    value: "spoderato",
    label: "스포데라토",
    description: "안감 없이 가볍게 마감",
  },
  {
    value: "fold7",
    label: "7폴드",
    description: "한 장의 원단을 7번 접어 제작",
  },
];

const deriveSewingStyle = (
  dimple: boolean,
  spoderato: boolean,
  fold7: boolean
): SewingStyle => {
  if (fold7) return "fold7";
  if (spoderato) return "spoderato";
  if (dimple) return "dimple";
  return "normal";
};

const applySewingStyle = (
  style: SewingStyle,
  setValue: UseFormSetValue<QuoteOrderOptions>
) => {
  setValue("dimple", style === "dimple");
  setValue("spoderato", style === "spoderato");
  setValue("fold7", style === "fold7");
};

export const SewingStep = () => {
  const { watch, setValue } = useFormContext<QuoteOrderOptions>();
  const tieType = watch("tieType");
  const dimple = watch("dimple");
  const spoderato = watch("spoderato");
  const fold7 = watch("fold7");

  const currentStyle = deriveSewingStyle(dimple, spoderato, fold7);
  const isDimpleAvailable = tieType === "AUTO";

  // Auto-reset dimple when switching to MANUAL
  useEffect(() => {
    if (tieType === "MANUAL" && dimple) {
      setValue("dimple", false);
      toast.info(
        "수동 봉제에서는 딤플을 선택할 수 없어요. 일반으로 변경했어요."
      );
    }
  }, [tieType, dimple, setValue]);

  const handleTieTypeChange = (newTieType: "MANUAL" | "AUTO") => {
    setValue("tieType", newTieType);
  };

  const handleStyleChange = (style: SewingStyle) => {
    if (style === "dimple" && !isDimpleAvailable) return;
    applySewingStyle(style, setValue);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          봉제를 설정해주세요
        </h2>
      </div>

      {/* Sewing Method Toggle */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-900">봉제 방식</h3>
        <div className="flex gap-3">
          {(["MANUAL", "AUTO"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTieTypeChange(type)}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                tieType === type
                  ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
              )}
            >
              {type === "MANUAL" ? "수동 봉제" : "자동 봉제"}
            </button>
          ))}
        </div>
      </div>

      {/* Style Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-900">스타일</h3>
        <div className="space-y-3">
          {SEWING_STYLES.map((style) => {
            const isDisabled = style.dimpleOnly && !isDimpleAvailable;
            const isSelected = currentStyle === style.value;

            return (
              <button
                key={style.value}
                type="button"
                onClick={() => handleStyleChange(style.value)}
                disabled={isDisabled}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 bg-white",
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-zinc-400"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div
                      className={cn(
                        "font-medium",
                        isDisabled ? "text-zinc-400" : "text-zinc-900"
                      )}
                    >
                      {style.label}
                    </div>
                    <div
                      className={cn(
                        "text-sm mt-0.5",
                        isDisabled ? "text-zinc-300" : "text-zinc-500"
                      )}
                    >
                      {style.description}
                    </div>
                    {style.dimpleOnly && !isDimpleAvailable && (
                      <div className="text-xs text-amber-600 mt-1">
                        자동 봉제에서만 선택할 수 있어요
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                  {!isSelected && !isDisabled && (
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-300 shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
