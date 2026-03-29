import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";

interface FieldInputRenderProps<T extends FieldValues> {
  field: ControllerRenderProps<T, Path<T>>;
  id: string;
  required: boolean | undefined;
  disabled: boolean | undefined;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}

interface FormFieldWrapperProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: ReactNode;
  description?: string;
  required?: boolean;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
  className?: string;
  renderInput: (props: FieldInputRenderProps<T>) => ReactNode;
}

export const FormFieldWrapper = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  rules,
  disabled,
  className,
  renderInput,
}: FormFieldWrapperProps<T>) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const describedBy = [
          description ? descriptionId : undefined,
          fieldState.error ? errorId : undefined,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Field orientation="vertical" className={className}>
            <FieldLabel htmlFor={id}>
              <FieldTitle>{label}</FieldTitle>
            </FieldLabel>
            {description ? (
              <FieldDescription id={descriptionId}>
                {description}
              </FieldDescription>
            ) : null}
            <FieldContent>
              {renderInput({
                field,
                id,
                required,
                disabled,
                "aria-invalid": !!fieldState.error,
                "aria-describedby": describedBy || undefined,
              })}
              <FieldError id={errorId} errors={[fieldState.error]} />
            </FieldContent>
          </Field>
        );
      }}
    />
  );
};
