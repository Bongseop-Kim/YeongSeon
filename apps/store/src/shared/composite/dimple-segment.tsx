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
        type="multiple"
        value={[selectedValue]}
        variant="outline"
        spacing={0}
        className="h-auto"
      >
        <ToggleGroupItem
          value="basic"
          disabled={disabled}
          onClick={() => {
            if (!disabled && value) onChange(false);
          }}
          className="h-auto px-2.5 py-1 text-xs font-medium data-[state=on]:bg-brand-ink data-[state=on]:text-white"
        >
          기본
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dimple"
          disabled={disabled}
          onClick={() => {
            if (!disabled && !value) onChange(true);
          }}
          className="h-auto px-2.5 py-1 text-xs font-medium data-[state=on]:bg-brand-ink data-[state=on]:text-white"
        >
          딤플
        </ToggleGroupItem>
      </ToggleGroup>
    </span>
  );
}
