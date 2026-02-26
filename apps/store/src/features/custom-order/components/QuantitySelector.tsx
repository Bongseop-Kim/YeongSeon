import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Control, FieldValues, Path } from "react-hook-form";
import { QUANTITY_CONFIG } from "@/features/custom-order/constants/FORM_OPTIONS";

type HasQuantity = FieldValues & { quantity: number };

interface QuantitySelectorProps<T extends HasQuantity = HasQuantity> {
  control: Control<T>;
}

export const QuantitySelector = <T extends HasQuantity>({ control }: QuantitySelectorProps<T>) => {
  return (
    <div>
      <Label className="text-sm font-medium text-zinc-900 mb-2 block">
        주문 수량
      </Label>
      <div className="flex items-center gap-3">
        <Controller
          name={"quantity" as Path<T>}
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              min={QUANTITY_CONFIG.min}
              value={field.value}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className="w-24 text-center"
              placeholder="수량"
            />
          )}
        />
        <span className="text-sm text-zinc-600">개</span>
      </div>
      <p className="text-xs text-zinc-600 mt-1">
        {QUANTITY_CONFIG.min}개 이상 주문 가능합니다
      </p>
    </div>
  );
};
