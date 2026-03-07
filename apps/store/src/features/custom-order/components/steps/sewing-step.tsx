import { useEffect } from "react";
import { useFormContext, type UseFormSetValue } from "react-hook-form";
import { RadioCard } from "@/components/composite/radio-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { SewingStyle } from "@/features/custom-order/types/wizard";
import { StepLayout } from "./step-layout";

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
  fold7: boolean,
): SewingStyle => {
  if (fold7) return "fold7";
  if (spoderato) return "spoderato";
  if (dimple) return "dimple";
  return "normal";
};

const applySewingStyle = (
  style: SewingStyle,
  setValue: UseFormSetValue<QuoteOrderOptions>,
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
        "수동 봉제에서는 딤플을 선택할 수 없어요. 일반으로 변경했어요.",
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
    <StepLayout
      guideTitle="스타일 가이드"
      guideItems={[
        "MANUAL: 기본 생산 안정적",
        "AUTO: 자동 봉제로 정밀감",
        "딤플은 AUTO에서만 활성화",
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>봉제 방식</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={tieType}
            onValueChange={(v) => handleTieTypeChange(v as "MANUAL" | "AUTO")}
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(["MANUAL", "AUTO"] as const).map((type) => (
                <RadioCard
                  key={type}
                  value={type}
                  id={`tie-type-${type}`}
                  selected={tieType === type}
                >
                  <CardHeader>
                    <CardTitle>
                      {type === "MANUAL" ? "수동 봉제" : "자동 봉제"}
                    </CardTitle>
                  </CardHeader>
                </RadioCard>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <RadioGroup
            value={currentStyle}
            onValueChange={(value) => handleStyleChange(value as SewingStyle)}
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SEWING_STYLES.map((style) => {
                const isDisabled = !!(style.dimpleOnly && !isDimpleAvailable);
                const itemId = `sewing-style-${style.value}`;
                const isSelected = currentStyle === style.value;

                return (
                  <RadioCard
                    key={style.value}
                    value={style.value}
                    id={itemId}
                    disabled={isDisabled}
                    selected={isSelected}
                  >
                    <CardHeader>
                      <CardTitle
                        className={cn(
                          "text-sm",
                          isDisabled ? "text-zinc-400" : "text-zinc-900",
                        )}
                      >
                        {style.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className={cn("text-xs", isDisabled ? "text-zinc-300" : "text-zinc-500")}>
                        {style.description}
                      </p>
                      {isDisabled && (
                        <p className="mt-1 text-xs text-zinc-300">
                          자동 봉제에서만 선택할 수 있어요
                        </p>
                      )}
                    </CardContent>
                  </RadioCard>
                );
              })}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </StepLayout>
  );
};
