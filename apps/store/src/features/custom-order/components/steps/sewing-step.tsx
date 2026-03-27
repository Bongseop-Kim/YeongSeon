import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { RadioChoiceField } from "@/components/composite/radio-choice-field";
import { CheckboxChoiceField } from "@/components/composite/checkbox-choice-field";
import { RadioGroup } from "@/components/ui/radio-group";
import { UtilityPagePanel } from "@/components/composite/utility-page";
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

  // Auto-reset dimple when switching to manual (null)
  useEffect(() => {
    if (tieType !== "AUTO" && dimple) {
      setValue("dimple", false);
      toast.info("수동 타이에서는 딤플을 선택할 수 없어요. 선택이 해제됐어요.");
    }
  }, [tieType, dimple, setValue]);

  const handleTieTypeChange = (v: string) => {
    if (v === "MANUAL") {
      setValue("tieType", null);
    } else if (v === "AUTO") {
      setValue("tieType", "AUTO");
    }
  };

  const handleStyleToggle = (
    key: "dimple" | "spoderato" | "fold7",
    checked: boolean,
  ) => {
    if (key === "dimple" && !isDimpleAvailable) return;
    setValue(key, checked);
  };

  const currentValues = { dimple, spoderato, fold7 };

  return (
    <StepLayout
      guideTitle="스타일 가이드"
      guideItems={[
        "수동 타이: 손으로 매듭을 묶는 일반 넥타이",
        "자동 타이: 지퍼로 고정, 매듭 불필요",
        "딤플은 자동 타이에서만 활성화",
        "스타일 옵션은 중복 선택 가능",
      ]}
    >
      <UtilityPagePanel title="타이 종류">
        <RadioGroup
          value={tieType ?? "MANUAL"}
          onValueChange={handleTieTypeChange}
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {(["MANUAL", "AUTO"] as const).map((type) => (
              <RadioChoiceField
                key={type}
                value={type}
                id={`tie-type-${type.toLowerCase()}`}
                selected={
                  type === "MANUAL" ? tieType === null : tieType === "AUTO"
                }
                variant="row"
                title={
                  type === "AUTO" ? "자동 타이 (지퍼)" : "수동 타이 (손매듭)"
                }
                description={
                  type === "AUTO"
                    ? "행사 운영과 단체 착용처럼 빠른 착용이 필요한 경우에 적합합니다."
                    : "매듭 표현과 전통적인 실루엣을 직접 조절할 수 있습니다."
                }
                meta={
                  <>
                    <span>{type === "AUTO" ? "딤플 가능" : "수동 매듭"}</span>
                    <span aria-hidden="true" className="text-zinc-300">
                      ·
                    </span>
                    <span>
                      {type === "AUTO" ? "착용 속도 우선" : "표현 자유도 우선"}
                    </span>
                  </>
                }
              />
            ))}
          </div>
        </RadioGroup>
      </UtilityPagePanel>

      <UtilityPagePanel
        title="봉제 스타일"
        description="필요한 디테일만 추가해 제작 완성도를 조절합니다. 중복 선택 가능합니다."
        contentClassName="px-0"
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SEWING_STYLES.map((style) => {
            const isDisabled = !!(style.dimpleOnly && !isDimpleAvailable);
            const isChecked = currentValues[style.key];
            const itemId = `sewing-style-${style.key}`;

            return (
              <CheckboxChoiceField
                key={style.key}
                id={itemId}
                disabled={isDisabled}
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleStyleToggle(style.key, !!checked)
                }
                title={style.label}
                description={style.description}
                meta={
                  isDisabled ? (
                    <span>자동 타이에서만 선택할 수 있어요</span>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </UtilityPagePanel>
    </StepLayout>
  );
};
