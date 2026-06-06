import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

export type TrackingMode = "has-tracking" | "no-tracking";

interface TrackingModeToggleProps {
  /** null이면 아직 선택하지 않은 상태 (주문서의 "이미 발송하셨나요? (선택)") */
  value: TrackingMode | null;
  onChange: (value: TrackingMode | null) => void;
}

/** 송장번호 있음/없음 2-path 전환 세그먼트 */
export function TrackingModeToggle({
  value,
  onChange,
}: TrackingModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value ?? ""}
      onValueChange={(v) => onChange(v ? (v as TrackingMode) : null)}
      variant="outline"
      spacing={0}
      className="grid w-full grid-cols-2"
    >
      <ToggleGroupItem
        value="has-tracking"
        className="h-9 w-full px-3 text-sm font-medium data-[state=on]:bg-brand-ink data-[state=on]:text-white"
      >
        송장번호가 있어요
      </ToggleGroupItem>
      <ToggleGroupItem
        value="no-tracking"
        className="h-9 w-full px-3 text-sm font-medium data-[state=on]:bg-brand-ink data-[state=on]:text-white"
      >
        송장번호가 없어요
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
