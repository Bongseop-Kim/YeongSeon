import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TIE_WIDTH_CONFIG } from "@/features/custom-order/constants/FORM_OPTIONS";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

export const SpecStep = () => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const sizeType = watch("sizeType");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          규격을 설정해주세요
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          기본값으로 진행하셔도 좋습니다
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Size Type Toggle */}
          <div>
            <Label className="text-sm font-medium text-zinc-900 mb-3 block">
              사이즈
            </Label>
            <div className="flex gap-3">
              {(["ADULT", "CHILD"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue("sizeType", type)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                    sizeType === type
                      ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                  )}
                >
                  {type === "ADULT" ? "성인용" : "아동용"}
                </button>
              ))}
            </div>
          </div>

          {/* Tie Width */}
          <div>
            <Label className="text-sm font-medium text-zinc-900 mb-3 block">
              넥타이 폭
            </Label>
            <Controller
              name="tieWidth"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-3">
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
                      if (!Number.isNaN(num)) field.onChange(num);
                    }}
                    className="w-24 text-center"
                  />
                  <span className="text-sm text-zinc-600">cm</span>
                </div>
              )}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {TIE_WIDTH_CONFIG.min}~{TIE_WIDTH_CONFIG.max}cm (
              {TIE_WIDTH_CONFIG.step}cm 단위)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
