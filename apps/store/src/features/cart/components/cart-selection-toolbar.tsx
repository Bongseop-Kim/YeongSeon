import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
    <CardContent className="flex items-center justify-between">
      <div className="flex gap-4 items-center">
        <Checkbox
          checked={isAllChecked}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
        />
        <Label className="text-md">전체 선택</Label>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onRemoveSelected}
          variant="outline"
          type="button"
          size="sm"
        >
          삭제
        </Button>
      </div>
    </CardContent>
  );
}
