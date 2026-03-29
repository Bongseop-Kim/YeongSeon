import { useId } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui-extended/select";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/shared/ui/field";

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
  const id = useId();

  return (
    <Field orientation="vertical">
      <FieldLabel htmlFor={id}>
        <FieldTitle>{label}</FieldTitle>
      </FieldLabel>
      <FieldContent>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={(field.value as string) || ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger id={id} className="w-full bg-white">
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
      </FieldContent>
    </Field>
  );
};
