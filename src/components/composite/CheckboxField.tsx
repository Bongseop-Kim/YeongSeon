import { Controller, type Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxFieldProps<T extends Record<string, any>> {
  name: keyof T;
  control: Control<T>;
  label: string;
  description?: string;
  id?: string;
}

export const CheckboxField = <T extends Record<string, any>>({
  name,
  control,
  label,
  description,
  id,
}: CheckboxFieldProps<T>) => {
  const fieldId = id || name;

  return (
    <Controller
      name={name as any}
      control={control}
      render={({ field }) => (
        <div className="flex items-start gap-3">
          <Checkbox
            id={fieldId as string}
            checked={field.value as boolean}
            onCheckedChange={field.onChange}
            className="mt-1"
          />
          <Label htmlFor={fieldId as string} subLabel={description}>
            {label}
          </Label>
        </div>
      )}
    />
  );
};
