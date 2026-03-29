import { Controller, useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { Input } from "@/shared/ui-extended/input";
import { TIE_WIDTH_CONFIG } from "@/features/custom-order/constants/FORM_OPTIONS";
import { RadioChoiceOptionGrid } from "@/features/custom-order/components/radio-choice-option-grid";
import { StepLayout } from "./step-layout";

export const SpecStep = () => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const sizeType = watch("sizeType");

  return (
    <StepLayout
      guideTitle="규격 팁"
      guideItems={[
        "성인용 기본 폭 8cm 권장",
        "아동용은 폭을 6~7cm로 축소",
        "최소/최대 범위 내 조정",
      ]}
    >
      <UtilityPagePanel title="사이즈 타입" contentClassName="px-0">
        <RadioChoiceOptionGrid
          value={sizeType}
          onValueChange={(v) => setValue("sizeType", v as "ADULT" | "CHILD")}
          options={(["ADULT", "CHILD"] as const).map((type) => ({
            value: type,
            id: `size-type-${type}`,
            selected: sizeType === type,
            title: type === "ADULT" ? "성인용" : "아동용",
            description:
              type === "ADULT"
                ? "가장 일반적인 행사·유니폼 기준 폭과 길이를 적용합니다."
                : "폭과 길이를 줄여 아동 착용 비율에 맞춘 규격입니다.",
            meta: (
              <span>
                {type === "ADULT" ? "기본 8cm 권장" : "폭 6~7cm 권장"}
              </span>
            ),
          }))}
        />
      </UtilityPagePanel>

      <UtilityPagePanel
        title="넥타이 폭"
        description="실제 착용감과 스타일 기준으로 폭을 조절합니다."
        contentClassName="space-y-2"
      >
        <Controller
          name="tieWidth"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={TIE_WIDTH_CONFIG.min}
                max={TIE_WIDTH_CONFIG.max}
                step={TIE_WIDTH_CONFIG.step}
                value={field.value}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return;
                  const num = Number(raw);
                  if (Number.isNaN(num)) return;
                  const clamped = Math.min(
                    TIE_WIDTH_CONFIG.max,
                    Math.max(TIE_WIDTH_CONFIG.min, num),
                  );
                  const offset = clamped - TIE_WIDTH_CONFIG.min;
                  const normalized =
                    Math.round(offset / TIE_WIDTH_CONFIG.step) *
                      TIE_WIDTH_CONFIG.step +
                    TIE_WIDTH_CONFIG.min;
                  field.onChange(normalized);
                }}
                className="h-9 w-[90px] rounded-lg border-zinc-300 text-center shadow-none"
              />
              <span className="text-xs text-zinc-500">cm</span>
            </div>
          )}
        />
        <p className="text-xs text-zinc-500">
          허용 범위: {TIE_WIDTH_CONFIG.min}~{TIE_WIDTH_CONFIG.max}cm (
          {TIE_WIDTH_CONFIG.step} 단위)
        </p>
      </UtilityPagePanel>
    </StepLayout>
  );
};
