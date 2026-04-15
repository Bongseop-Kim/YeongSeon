import { cn } from "@/shared/lib/utils";

interface DimpleSegmentProps {
  value: boolean;
  onChange: (value: boolean) => void;
  isActive: boolean;
}

export function DimpleSegment({
  value,
  onChange,
  isActive,
}: DimpleSegmentProps) {
  return (
    <>
      {(["basic", "dimple"] as const).map((type, i) => (
        <button
          key={type}
          type="button"
          aria-pressed={
            (type === "basic" && !value) || (type === "dimple" && value)
          }
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors",
            i > 0 &&
              (isActive
                ? "border-l border-border"
                : "border-l border-white/30"),
            (type === "basic" && !value) || (type === "dimple" && value)
              ? isActive
                ? "bg-white text-brand-ink"
                : "bg-brand-ink text-white"
              : isActive
                ? "bg-white text-muted-foreground"
                : "text-muted-foreground",
          )}
          onClick={() => onChange(type === "dimple")}
        >
          {type === "basic" ? "기본" : "딤플"}
        </button>
      ))}
    </>
  );
}
