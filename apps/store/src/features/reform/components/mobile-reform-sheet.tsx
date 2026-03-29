import { Sheet, SheetContent, SheetTitle } from "@/shared/ui-extended/sheet";
import { SheetActionFooter } from "@/shared/composite/sheet-action-footer";
interface MobileReformSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: () => void;
  onOrder: () => void;
  tieCount: number;
  totalCost: number;
}

export function MobileReformSheet({
  open,
  onOpenChange,
  onAddToCart,
  onOrder,
  tieCount,
  totalCost,
}: MobileReformSheetProps) {
  const isActionDisabled = tieCount === 0;

  const handleAddToCart = () => {
    onAddToCart();
    onOpenChange(false);
  };

  const handleOrder = () => {
    onOrder();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[40vh]">
        <SheetTitle className="sr-only">주문 요약</SheetTitle>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>총 {tieCount}개</span>
            <span>{totalCost.toLocaleString()}원</span>
          </div>
        </div>

        <SheetActionFooter
          onPrimary={handleAddToCart}
          onOrder={handleOrder}
          primaryDisabled={isActionDisabled}
          orderDisabled={isActionDisabled}
        />
      </SheetContent>
    </Sheet>
  );
}
