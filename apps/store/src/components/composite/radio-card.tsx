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
      className={cn(
        "group block h-full cursor-pointer",
        disabled && "cursor-not-allowed",
      )}
    >
      <RadioGroupItem
        value={value}
        id={id}
        disabled={disabled}
        className="sr-only"
      />
      <Card
        className={cn(
          "relative h-full overflow-hidden rounded-[18px] border border-stone-200 bg-white shadow-none transition-[transform,border-color,background-color,box-shadow] duration-200 focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:ring-offset-1 focus-within:ring-offset-white",
          disabled
            ? "border-zinc-100 bg-zinc-50 text-zinc-400"
            : selected
              ? "border-zinc-900 bg-stone-50/60"
              : "hover:border-stone-300",
          className,
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-4 top-4 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-stone-300 bg-white transition-all duration-200",
            disabled && "border-zinc-200 bg-zinc-100",
            selected && "border-zinc-900 bg-zinc-900",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-transparent transition-all duration-200",
              disabled && "bg-zinc-300",
              selected && "bg-white",
            )}
          />
        </div>
        {children}
      </Card>
    </Label>
  );
}
