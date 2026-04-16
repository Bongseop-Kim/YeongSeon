import { cn } from "@/shared/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

interface DimpleSegmentProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function DimpleSegment({
  value,
  onChange,
  disabled,
}: DimpleSegmentProps) {
  const selectedValue = value ? "dimple" : "basic";

  return (
    <span className={cn(disabled && "pointer-events-none opacity-40")}>
      <ToggleGroup
        type="single"
        value={selectedValue}
        onValueChange={(v) => onChange(v === "dimple")}
        variant="outline"
        spacing={0}
        className="h-auto"
      >
        <ToggleGroupItem
          value="basic"
          disabled={disabled}
          className="h-auto px-2.5 py-1 text-xs font-medium data-[state=on]:bg-brand-ink data-[state=on]:text-white"
        >
          기본
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dimple"
          disabled={disabled}
          className="h-auto px-2.5 py-1 text-xs font-medium data-[state=on]:bg-brand-ink data-[state=on]:text-white"
        >
          딤플
        </ToggleGroupItem>
      </ToggleGroup>
    </span>
  );
}
