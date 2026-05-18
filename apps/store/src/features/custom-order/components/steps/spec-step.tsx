import { Controller, useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { ChipSinglePicker } from "@/shared/composite/chip-single-picker";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui-extended/input";
import { TIE_WIDTH_CONFIG } from "@/features/custom-order/constants/FORM_OPTIONS";

export const SpecStep = () => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const sizeType = watch("sizeType");
  const tieWidthId = "custom-order-tie-width";

  return (
    <FieldGroup>
      <Field>
        <FieldTitle>사이즈 타입</FieldTitle>
        <FieldContent>
          <ChipSinglePicker
            ariaLabel="사이즈 타입"
            value={sizeType}
            onValueChange={(v) => setValue("sizeType", v as "ADULT" | "CHILD")}
            options={(["ADULT", "CHILD"] as const).map((type) => ({
              value: type,
              label: type === "ADULT" ? "성인용" : "아동용",
            }))}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor={tieWidthId}>
          <FieldTitle>넥타이 폭</FieldTitle>
        </FieldLabel>
        <Controller
          name="tieWidth"
          control={control}
          render={({ field }) => (
            <FieldContent className="flex-row items-center">
              <Input
                id={tieWidthId}
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
                className="sm:w-1/2"
              />
              <span className="text-xs text-zinc-500">cm</span>
            </FieldContent>
          )}
        />
        <FieldDescription>
          허용 범위: {TIE_WIDTH_CONFIG.min}~{TIE_WIDTH_CONFIG.max}cm (
          {TIE_WIDTH_CONFIG.step} 단위)
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
};
