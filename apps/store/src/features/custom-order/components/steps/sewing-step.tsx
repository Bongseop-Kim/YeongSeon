import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { CheckboxField } from "@/shared/composite/check-box-field";
import { ChipSinglePicker } from "@/shared/composite/chip-single-picker";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { toast } from "@/shared/lib/toast";

const SEWING_STYLES: {
  key: "dimple" | "spoderato" | "fold7";
  label: string;
  autoOnly?: boolean;
}[] = [
  {
    key: "dimple",
    label: "딤플",
    autoOnly: true,
  },
  {
    key: "spoderato",
    label: "스포데라토",
  },
  {
    key: "fold7",
    label: "7폴드",
  },
];

export const SewingStep = () => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const tieType = watch("tieType");
  const dimple = watch("dimple");

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

  return (
    <div className="space-y-6">
      <UtilityPagePanel title="타이 종류">
        <ChipSinglePicker
          ariaLabel="타이 종류"
          value={tieType ?? "MANUAL"}
          onValueChange={handleTieTypeChange}
          options={(["MANUAL", "AUTO"] as const).map((type) => ({
            value: type,
            label: type === "AUTO" ? "자동 타이 (지퍼)" : "수동 타이 (손매듭)",
          }))}
        />
      </UtilityPagePanel>

      <UtilityPagePanel title="봉제 스타일">
        <div className="space-y-3">
          {SEWING_STYLES.map((style) => {
            return (
              <CheckboxField
                key={style.key}
                name={style.key}
                control={control}
                label={style.label}
                disabled={!!(style.autoOnly && !isDimpleAvailable)}
              />
            );
          })}
        </div>
      </UtilityPagePanel>
    </div>
  );
};
