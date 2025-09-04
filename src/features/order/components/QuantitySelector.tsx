import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Control } from "react-hook-form";
import type { OrderOptions } from "../types/order";
import { QUANTITY_CONFIG } from "../constants/formOptions";

interface QuantitySelectorProps {
  control: Control<OrderOptions>;
}

export const QuantitySelector = ({ control }: QuantitySelectorProps) => {
  return (
    <div>
      <Label className="text-sm font-medium text-stone-900 mb-2 block">
        주문 수량
      </Label>
      <div className="flex items-center gap-3">
        <Controller
          name="quantity"
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
        <span className="text-sm text-stone-600">개</span>
      </div>
      <p className="text-xs text-stone-600 mt-1">
        {QUANTITY_CONFIG.min}개 이상 주문 가능합니다
      </p>
    </div>
  );
};
