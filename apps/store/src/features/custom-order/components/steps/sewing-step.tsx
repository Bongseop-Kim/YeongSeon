import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { RadioCard } from "@/components/composite/radio-card";
import { CheckboxCard } from "@/components/composite/checkbox-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import { StepLayout } from "./step-layout";

const SEWING_STYLES: {
  key: "dimple" | "spoderato" | "fold7";
  label: string;
  description: string;
  dimpleOnly?: boolean;
}[] = [
  {
    key: "dimple",
    label: "딤플",
    description: "매듭 아래 자연스러운 주름",
    dimpleOnly: true,
  },
  {
    key: "spoderato",
    label: "스포데라토",
    description: "안감 없이 가볍게 마감",
  },
  {
    key: "fold7",
    label: "7폴드",
    description: "한 장의 원단을 7번 접어 제작",
  },
];

export const SewingStep = () => {
  const { watch, setValue } = useFormContext<QuoteOrderOptions>();
  const tieType = watch("tieType");
  const dimple = watch("dimple");
  const spoderato = watch("spoderato");
  const fold7 = watch("fold7");

  const isDimpleAvailable = tieType === "AUTO";

  // Auto-reset dimple when switching to MANUAL
  useEffect(() => {
    if (tieType === "MANUAL" && dimple) {
      setValue("dimple", false);
      toast.info(
        "수동 봉제에서는 딤플을 선택할 수 없어요. 선택이 해제됐어요.",
      );
    }
  }, [tieType, dimple, setValue]);

  const handleTieTypeChange = (newTieType: "MANUAL" | "AUTO") => {
    setValue("tieType", newTieType);
  };

  const handleStyleToggle = (key: "dimple" | "spoderato" | "fold7", checked: boolean) => {
    if (key === "dimple" && !isDimpleAvailable) return;
    setValue(key, checked);
  };

  const currentValues = { dimple, spoderato, fold7 };

  return (
    <StepLayout
      guideTitle="스타일 가이드"
      guideItems={[
        "MANUAL: 기본 생산 안정적",
        "AUTO: 자동 봉제로 정밀감",
        "딤플은 AUTO에서만 활성화",
        "스타일 옵션은 중복 선택 가능",
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>봉제 방식</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={tieType ?? ""}
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
        <CardHeader>
          <CardTitle>봉제 스타일 (중복 선택 가능)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SEWING_STYLES.map((style) => {
              const isDisabled = !!(style.dimpleOnly && !isDimpleAvailable);
              const isChecked = currentValues[style.key];
              const itemId = `sewing-style-${style.key}`;

              return (
                <CheckboxCard
                  key={style.key}
                  id={itemId}
                  disabled={isDisabled}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleStyleToggle(style.key, !!checked)}
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
                </CheckboxCard>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </StepLayout>
  );
};
