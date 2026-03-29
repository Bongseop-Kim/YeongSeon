import { Button } from "@/shared/ui-extended/button";
import { SheetFooter } from "@/shared/ui-extended/sheet";

interface SheetActionFooterProps {
  onPrimary: () => void;
  onOrder: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  orderDisabled?: boolean;
}

export function SheetActionFooter({
  onPrimary,
  onOrder,
  primaryLabel = "장바구니",
  primaryDisabled = false,
  orderDisabled = false,
}: SheetActionFooterProps) {
  return (
    <SheetFooter className="shrink-0">
      <div className="flex w-full gap-2">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="flex-1"
        >
          {primaryLabel}
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onOrder}
          disabled={orderDisabled}
          className="flex-1"
        >
          주문하기
        </Button>
      </div>
    </SheetFooter>
  );
}
