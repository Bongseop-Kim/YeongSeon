import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RadioCardProps {
  value: string;
  id: string;
  selected: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function RadioCard({
  value,
  id,
  selected,
  disabled,
  className,
  children,
}: RadioCardProps) {
  return (
    <Label
      htmlFor={id}
      className={cn("block h-full cursor-pointer", disabled && "cursor-not-allowed")}
    >
      <RadioGroupItem value={value} id={id} disabled={disabled} className="sr-only" />
      <Card
        className={cn(
          "h-full",
          disabled
            ? "border-zinc-100 bg-zinc-50"
            : selected
            ? "border-zinc-900 bg-zinc-50"
            : "hover:border-zinc-400",
          className,
        )}
      >
        {children}
      </Card>
    </Label>
  );
}
