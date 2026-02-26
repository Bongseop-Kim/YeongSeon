import { Button } from "@/components/ui/button";
import { useBreakpoint } from "@/providers/breakpoint-provider";

interface ReformActionButtonsProps {
  onAddToCart: () => void;
  onOrder: () => void;
  disabled?: boolean;
}

export function ReformActionButtons({
  onAddToCart,
  onOrder,
  disabled,
}: ReformActionButtonsProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <Button type="button" onClick={onOrder} size="xl" className="w-full" disabled={disabled}>
        {disabled ? "업로드 중..." : "주문하기"}
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
        disabled={disabled}
      >
        {disabled ? "업로드 중..." : "장바구니"}
      </Button>
      <Button type="button" onClick={onOrder} size="xl" className="flex-1" disabled={disabled}>
        {disabled ? "업로드 중..." : "주문하기"}
      </Button>
    </div>
  );
}
