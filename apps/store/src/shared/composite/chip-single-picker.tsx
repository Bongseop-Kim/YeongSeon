import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

export interface ChipSinglePickerOption {
  label: ReactNode;
  value: string;
  disabled?: boolean;
}

interface ChipSinglePickerProps {
  options: ChipSinglePickerOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function ChipSinglePicker({
  options,
  value,
  onValueChange,
  ariaLabel,
  disabled,
}: ChipSinglePickerProps) {
  const handleValueChange = (nextValue: string) => {
    if (!nextValue || nextValue === value) return;
    onValueChange(nextValue);
  };

  return (
    <ToggleGroup
      type="single"
      value={value ?? undefined}
      onValueChange={handleValueChange}
      aria-label={ariaLabel}
      disabled={disabled}
      variant="outline"
      spacing={1}
      className={cn("flex-wrap", disabled && "opacity-50")}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={disabled || option.disabled}
          className="h-auto rounded-full border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 shadow-none hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 data-[state=on]:border-brand-ink data-[state=on]:bg-brand-ink data-[state=on]:text-white"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
