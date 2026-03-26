import { Button } from "@/components/ui-extended/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CartSelectionToolbarProps {
  isAllChecked: boolean;
  onToggleAll: (checked: boolean) => void;
  onRemoveSelected: () => void;
}

export function CartSelectionToolbar({
  isAllChecked,
  onToggleAll,
  onRemoveSelected,
}: CartSelectionToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200 py-4">
      <div className="flex gap-4 items-center">
        <Checkbox
          checked={isAllChecked}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
          data-testid="cart-select-all"
        />
        <Label className="text-md">전체 선택</Label>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onRemoveSelected}
          variant="outline"
          type="button"
          size="sm"
          data-testid="cart-remove-selected"
        >
          삭제
        </Button>
      </div>
    </div>
  );
}
