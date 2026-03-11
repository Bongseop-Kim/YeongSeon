import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CheckboxCardProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function CheckboxCard({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
  children,
}: CheckboxCardProps) {
  return (
    <Label
      htmlFor={id}
      className={cn("block h-full cursor-pointer", disabled && "cursor-not-allowed")}
    >
      <Card
        className={cn(
          "h-full focus-within:ring-2 focus-within:ring-zinc-900 focus-within:ring-offset-1",
          disabled
            ? "border-zinc-100 bg-zinc-50"
            : checked
            ? "border-zinc-900 bg-zinc-50"
            : "hover:border-zinc-400",
          className,
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="sr-only"
        />
        {children}
      </Card>
    </Label>
  );
}
