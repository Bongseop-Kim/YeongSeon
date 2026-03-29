import type { ReactNode } from "react";
import type {
  Control,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";
import { Textarea } from "@/shared/ui/textarea";
import { FormFieldWrapper } from "@/shared/composite/form-field-wrapper";

interface TextareaFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: ReactNode;
  description?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
  className?: string;
  textareaClassName?: string;
}

export const TextareaField = <T extends FieldValues>({
  placeholder,
  maxLength,
  textareaClassName,
  ...rest
}: TextareaFieldProps<T>) => (
  <FormFieldWrapper
    {...rest}
    renderInput={({ field, ...renderProps }) => (
      <Textarea
        {...field}
        {...renderProps}
        placeholder={placeholder}
        maxLength={maxLength}
        className={textareaClassName}
      />
    )}
  />
);
