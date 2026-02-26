import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckboxField } from "@/components/composite/check-box-field";
import { QuantitySelector } from "@/features/custom-order/components/QuantitySelector";
import { PackageSelector } from "@/features/custom-order/components/PackageSelector";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { PackagePreset } from "@/features/custom-order/types/wizard";
import { cn } from "@/lib/utils";

const QUANTITY_PRESETS = [4, 8, 12, 20, 50, 100] as const;

interface QuantityStepProps {
  isLoggedIn: boolean;
  selectedPackage: PackagePreset | null;
  onSelectPackage: (preset: PackagePreset) => void;
}

export const QuantityStep = ({
  isLoggedIn,
  selectedPackage,
  onSelectPackage,
}: QuantityStepProps) => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const quantity = watch("quantity");
  const fabricProvided = watch("fabricProvided");
  const reorder = watch("reorder");
  const prevFabricProvided = useRef(fabricProvided);

  // fabricProvided true 전환 시 연관 필드 리셋
  useEffect(() => {
    if (fabricProvided && !prevFabricProvided.current) {
      setValue("reorder", false);
      setValue("fabricType", null);
      setValue("designType", null);
    }
    prevFabricProvided.current = fabricProvided;
  }, [fabricProvided, setValue]);

  const handlePresetClick = (preset: number) => {
    setValue("quantity", preset);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          수량을 선택해주세요
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          최소 4개부터 주문 가능합니다
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label className="text-sm font-medium text-zinc-900 mb-3 block">
              빠른 선택
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUANTITY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                    quantity === preset
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                  )}
                >
                  {preset}개
                </button>
              ))}
            </div>
          </div>

          <QuantitySelector control={control} />

          {quantity >= 100 && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              100개 이상은 견적요청으로 진행됩니다. 담당자가 별도 안내해드려요.
            </div>
          )}
        </CardContent>
      </Card>

      {!fabricProvided && !reorder && (
        <PackageSelector
          quantity={quantity}
          isLoggedIn={isLoggedIn}
          selectedPackage={selectedPackage}
          onSelectPackage={onSelectPackage}
        />
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Label className="text-sm font-medium text-zinc-900 block">
            시작 방식
          </Label>
          <div className="space-y-3">
            <CheckboxField
              name="fabricProvided"
              control={control}
              label="원단 직접 제공"
              description="보유한 원단을 보내주시면 봉제만 진행합니다"
            />
            <CheckboxField
              name="reorder"
              control={control}
              label="재주문"
              description="이전에 주문한 동일 디자인으로 재주문합니다"
              disabled={fabricProvided}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
