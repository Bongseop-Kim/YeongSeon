import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-extended/select";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: readonly SelectOption[];
  placeholder?: string;
}

export const SelectField = <T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder = "선택하세요",
}: SelectFieldProps<T>) => {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
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
