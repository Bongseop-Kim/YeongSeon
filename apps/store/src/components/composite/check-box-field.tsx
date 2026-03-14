import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
        <div
          className={cn(
            "flex gap-2",
            description ? "items-start" : "items-center",
          )}
        >
          <Checkbox
            id={fieldId as string}
            checked={field.value as boolean}
            onCheckedChange={field.onChange}
            disabled={disabled}
            className={cn("mt-0", description && "mt-1")}
          />
          <Label htmlFor={fieldId as string} subLabel={description}>
            {label}
          </Label>
        </div>
      )}
    />
  );
};
