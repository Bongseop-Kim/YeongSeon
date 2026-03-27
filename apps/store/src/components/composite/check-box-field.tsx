import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  description?: string;
  id?: string;
  disabled?: boolean;
}

export const CheckboxField = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  id,
  disabled,
}: CheckboxFieldProps<T>) => {
  const fieldId = id || name;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field
          orientation="horizontal"
          className={cn("gap-2", description ? "items-start" : "items-center")}
        >
          <Checkbox
            id={fieldId as string}
            checked={field.value as boolean}
            onCheckedChange={field.onChange}
            disabled={disabled}
            className={cn("mt-0", description && "mt-1")}
          />
          <FieldContent className="gap-1">
            <FieldLabel htmlFor={fieldId as string}>
              <FieldTitle>{label}</FieldTitle>
            </FieldLabel>
            {description ? (
              <FieldDescription className="mt-0">
                {description}
              </FieldDescription>
            ) : null}
          </FieldContent>
        </Field>
      )}
    />
  );
};
