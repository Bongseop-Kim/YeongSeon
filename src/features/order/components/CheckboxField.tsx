import { Controller, type Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { OrderOptions } from "../types/order";

interface CheckboxFieldProps {
  name: keyof OrderOptions;
  control: Control<OrderOptions>;
  label: string;
  description?: string;
  id?: string;
}

export const CheckboxField = ({
  name,
  control,
  label,
  description,
  id,
}: CheckboxFieldProps) => {
  const fieldId = id || name;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-start gap-3">
          <Checkbox
            id={fieldId}
            checked={field.value as boolean}
            onCheckedChange={field.onChange}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor={fieldId}
              className={`text-sm font-medium text-stone-900 cursor-pointer block ${
                description ? "mb-1" : "mt-0.5"
              }`}
            >
              {label}
            </Label>
            {description && (
              <p className="text-xs text-stone-600 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
};
