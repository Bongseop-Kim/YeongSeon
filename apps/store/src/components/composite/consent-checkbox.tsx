import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
    <div className={cn("flex gap-2 items-start", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked === true)}
        className="mt-1"
      />
      <Label htmlFor={id} subLabel={description}>
        {required ? `(필수) ${label}` : label}
      </Label>
    </div>
  );
};
