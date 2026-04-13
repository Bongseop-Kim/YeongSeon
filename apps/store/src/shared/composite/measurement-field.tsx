import { useId, type JSX } from "react";
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
  type RegisterOptions,
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

interface MeasurementFieldBaseProps {
  label: string;
  requiredMessage?: string;
  description?: string;
  placeholder?: string;
}

interface MeasurementFieldRegisteredProps<
  T extends FieldValues,
> extends MeasurementFieldBaseProps {
  control: Control<T>;
  name: Path<T>;
  rules?: RegisterOptions<T, Path<T>>;
}

interface MeasurementFieldControlledProps<
  T extends FieldValues,
> extends MeasurementFieldBaseProps {
  field: ControllerRenderProps<T, Path<T>>;
  fieldState: ControllerFieldState;
}

type MeasurementFieldProps<T extends FieldValues> =
  | MeasurementFieldRegisteredProps<T>
  | MeasurementFieldControlledProps<T>;

const validateMeasurementValue = (value: unknown, requiredMessage?: string) => {
  if (value == null) return requiredMessage || true;
  return Number.isFinite(value as number) && (value as number) > 0
    ? true
    : "0보다 큰 숫자를 입력해주세요.";
};

const mergeMeasurementRules = <T extends FieldValues>(
  rules: RegisterOptions<T, Path<T>> | undefined,
  requiredMessage?: string,
): RegisterOptions<T, Path<T>> => {
  const baseValidate = (value: unknown) =>
    validateMeasurementValue(value, requiredMessage);
  const validateRule = rules?.validate;

  if (!validateRule) {
    return {
      ...rules,
      required: rules?.required || requiredMessage || false,
      validate: baseValidate,
    };
  }

  if (typeof validateRule === "function") {
    return {
      ...rules,
      required: requiredMessage || rules.required || false,
      validate: (value, formValues) => {
        const measurementResult = baseValidate(value);

        if (measurementResult !== true) return measurementResult;
        return validateRule(value, formValues);
      },
    };
  }

  const mergedValidate = Object.fromEntries(
    Object.entries(validateRule).map(([key, validate]) => [
      key,
      (value: T[Path<T>], formValues: T) => {
        const measurementResult = baseValidate(value);

        if (measurementResult !== true) return measurementResult;
        return validate(value, formValues);
      },
    ]),
  ) as RegisterOptions<T, Path<T>>["validate"];

  return {
    ...rules,
    required: requiredMessage || rules.required || false,
    validate: mergedValidate,
  };
};

interface MeasurementFieldInnerProps<
  T extends FieldValues,
> extends MeasurementFieldBaseProps {
  field: ControllerRenderProps<T, Path<T>>;
  fieldState: ControllerFieldState;
  id: string;
  errorId: string;
}

const MeasurementFieldInner = <T extends FieldValues>({
  field,
  fieldState,
  label,
  requiredMessage,
  description,
  placeholder,
  id,
  errorId,
}: MeasurementFieldInnerProps<T>) => {
  return (
    <Field orientation="vertical">
      <FieldLabel htmlFor={id}>
        <FieldTitle>
          {requiredMessage && <Required />}
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
              e.target.value === "" || !Number.isFinite(num) ? undefined : num,
            );
          }}
          unit="cm"
          aria-invalid={!!fieldState.error}
          aria-describedby={fieldState.error ? errorId : undefined}
        />
        <FieldError id={errorId} errors={[fieldState.error]} />
      </FieldContent>
    </Field>
  );
};

export function MeasurementField<T extends FieldValues>(
  props: MeasurementFieldRegisteredProps<T>,
): JSX.Element;
export function MeasurementField<T extends FieldValues>(
  props: MeasurementFieldControlledProps<T>,
): JSX.Element;
export function MeasurementField<T extends FieldValues>(
  props: MeasurementFieldProps<T>,
) {
  const id = useId();
  const errorId = `${id}-error`;

  if ("field" in props) {
    return <MeasurementFieldInner {...props} id={id} errorId={errorId} />;
  }

  const {
    control,
    name,
    rules,
    label,
    requiredMessage,
    description,
    placeholder,
  } = props;

  return (
    <Controller
      control={control}
      name={name}
      rules={mergeMeasurementRules(rules, requiredMessage)}
      render={({ field, fieldState }) => (
        <MeasurementFieldInner
          field={field}
          fieldState={fieldState}
          label={label}
          requiredMessage={requiredMessage}
          description={description}
          placeholder={placeholder}
          id={id}
          errorId={errorId}
        />
      )}
    />
  );
}
