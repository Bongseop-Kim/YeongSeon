import { Checkbox } from "@/shared/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { cn } from "@/shared/lib/utils";

interface CheckboxInputProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export const CheckboxInput = ({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  required = false,
  className,
}: CheckboxInputProps) => {
  return (
    <Field
      orientation="horizontal"
      className={cn(
        "gap-2",
        description ? "items-start" : "items-center",
        className,
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(nextChecked: boolean | "indeterminate") =>
          onCheckedChange(nextChecked === true)
        }
        className={description ? "mt-1" : undefined}
      />
      <FieldContent className="gap-1">
        <FieldLabel htmlFor={id}>
          <FieldTitle>{required ? `[필수] ${label}` : label}</FieldTitle>
        </FieldLabel>
        {description ? (
          <FieldDescription className="mt-0">{description}</FieldDescription>
        ) : null}
      </FieldContent>
    </Field>
  );
};
