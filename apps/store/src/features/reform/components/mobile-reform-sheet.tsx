import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConsentCheckbox } from "@/components/composite/consent-checkbox";

interface MobileReformSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cancellationConsent: boolean;
  onCancellationConsentChange: (value: boolean) => void;
  onAddToCart: () => void;
  onOrder: () => void;
  tieCount: number;
  totalCost: number;
}

export function MobileReformSheet({
  open,
  onOpenChange,
  cancellationConsent,
  onCancellationConsentChange,
  onAddToCart,
  onOrder,
  tieCount,
  totalCost,
}: MobileReformSheetProps) {
  const isActionDisabled = tieCount === 0 || !cancellationConsent;

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
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>총 {tieCount}개</span>
            <span>{totalCost.toLocaleString()}원</span>
          </div>
          <ConsentCheckbox
            id="mobile-cancellation-consent"
            checked={cancellationConsent}
            onCheckedChange={onCancellationConsentChange}
            label="취소/환불 불가 동의"
            description="판매자가 수선물을 수령(접수)한 이후부터 취소 및 환불이 불가능합니다."
            required
          />
        </div>

        <SheetFooter className="shrink-0">
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={handleAddToCart}
              disabled={isActionDisabled}
              className="flex-1"
            >
              장바구니
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={handleOrder}
              disabled={isActionDisabled}
              className="flex-1"
            >
              주문하기
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
