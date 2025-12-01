import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface ReformActionButtonsProps {
  onAddToCart: () => void;
  onOrder: () => void;
}

export function ReformActionButtons({
  onAddToCart,
  onOrder,
}: ReformActionButtonsProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Button type="button" onClick={onOrder} size="xl" className="w-full">
        주문하기
      </Button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <Button
        type="button"
        variant="outline"
        size="xl"
        onClick={onAddToCart}
        className="flex-1"
      >
        장바구니
      </Button>
      <Button type="button" onClick={onOrder} size="xl" className="flex-1">
        주문하기
      </Button>
    </div>
  );
}
