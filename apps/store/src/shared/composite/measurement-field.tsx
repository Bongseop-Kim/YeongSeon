import { useId } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Input } from "@/shared/ui-extended/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { Required } from "@/shared/ui/required";

interface MeasurementFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  requiredMessage: string;
  description?: string;
  placeholder?: string;
}

export function MeasurementField<T extends FieldValues>({
  control,
  name,
  label,
  requiredMessage,
  description,
  placeholder,
}: MeasurementFieldProps<T>) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      rules={{
        required: requiredMessage,
        validate: (value: unknown) =>
          value != null &&
          Number.isFinite(value as number) &&
          (value as number) > 0
            ? true
            : "0보다 큰 숫자를 입력해주세요.",
      }}
      render={({ field, fieldState }) => (
        <Field orientation="vertical">
          <FieldLabel htmlFor={id}>
            <FieldTitle>
              <Required />
              {label}
            </FieldTitle>
          </FieldLabel>
          {description && (
            <FieldDescription className="-mt-1 text-xs">
              {description}
            </FieldDescription>
          )}
          <FieldContent>
            <Input
              {...field}
              id={id}
              type="number"
              placeholder={placeholder}
              value={(field.value as number | undefined) ?? ""}
              onChange={(e) => {
                const num = Number(e.target.value);
                field.onChange(
                  e.target.value === "" || !Number.isFinite(num)
                    ? undefined
                    : num,
                );
              }}
              unit="cm"
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? errorId : undefined}
            />
            <FieldError id={errorId} errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  );
}
