import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { TIE_WIDTH_CONFIG } from "@/features/custom-order/constants/FORM_OPTIONS";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
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
      <Card>
        <CardContent className="space-y-3 px-[18px] py-[18px]">
          <Label>사이즈 타입</Label>
          <RadioGroup
            value={sizeType}
            onValueChange={(v) => setValue("sizeType", v as "ADULT" | "CHILD")}
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(["ADULT", "CHILD"] as const).map((type) => (
                <Label
                  key={type}
                  htmlFor={`size-type-${type}`}
                  className={cn(
                    "flex h-[42px] cursor-pointer items-center justify-center px-3 text-sm",
                    sizeType === type ? "font-semibold" : ""
                  )}
                >
                  <RadioGroupItem
                    value={type}
                    id={`size-type-${type}`}
                    className="sr-only"
                  />
                  {type === "ADULT" ? "성인용" : "아동용"}
                </Label>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 px-[18px] py-[18px]">
          <Label>넥타이 폭</Label>
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
                    const clamped = Math.min(TIE_WIDTH_CONFIG.max, Math.max(TIE_WIDTH_CONFIG.min, num));
                    const offset = clamped - TIE_WIDTH_CONFIG.min;
                    const normalized = Math.round(offset / TIE_WIDTH_CONFIG.step) * TIE_WIDTH_CONFIG.step + TIE_WIDTH_CONFIG.min;
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
        </CardContent>
      </Card>
    </StepLayout>
  );
};
