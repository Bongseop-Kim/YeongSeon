import type { ReactNode } from "react";
import type {
  Control,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";
import { Input } from "@/shared/ui-extended/input";
import { FormFieldWrapper } from "@/shared/composite/form-field-wrapper";

interface InputFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: ReactNode;
  description?: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  unit?: string;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
  className?: string;
}

export const InputField = <T extends FieldValues>({
  type,
  placeholder,
  unit,
  ...rest
}: InputFieldProps<T>) => (
  <FormFieldWrapper
    {...rest}
    renderInput={({ field, ...renderProps }) => (
      <Input
        {...field}
        {...renderProps}
        type={type}
        placeholder={placeholder}
        unit={unit}
      />
    )}
  />
);
