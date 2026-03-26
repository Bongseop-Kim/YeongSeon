import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export const ConsentCheckbox = ({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  required = false,
  className,
}: ConsentCheckboxProps) => {
  return (
    <Field
      orientation="horizontal"
      className={cn("gap-2 items-start", className)}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked === true)}
        className="mt-1"
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
