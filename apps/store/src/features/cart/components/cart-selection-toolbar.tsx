import { Button } from "@/shared/ui-extended/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldLabel, FieldTitle } from "@/shared/ui/field";

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
  const selectAllCheckboxId = "cart-select-all";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-t border-stone-200 px-0.5 pb-2.5 pt-2">
      <Field orientation="horizontal" variant="toolbar">
        <Checkbox
          id={selectAllCheckboxId}
          checked={isAllChecked}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
          data-testid="cart-select-all"
        />
        <FieldLabel htmlFor={selectAllCheckboxId} variant="toolbar">
          <FieldTitle variant="toolbar">전체 선택</FieldTitle>
        </FieldLabel>
      </Field>
      <div className="flex items-center gap-4 text-sm font-medium text-zinc-700">
        <Button
          onClick={onRemoveSelected}
          variant="none"
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
