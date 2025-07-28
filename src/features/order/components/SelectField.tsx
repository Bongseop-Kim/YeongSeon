import { Controller, type Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderOptions } from "../types/order";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: keyof OrderOptions;
  control: Control<OrderOptions>;
  label: string;
  options: readonly SelectOption[];
  placeholder?: string;
}

export const SelectField = ({
  name,
  control,
  label,
  options,
  placeholder = "선택하세요",
}: SelectFieldProps) => {
  return (
    <div>
      <Label className="text-sm font-medium text-stone-900 mb-2 block">
        {label}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={(field.value as string) || ""}
            onValueChange={field.onChange}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
};
