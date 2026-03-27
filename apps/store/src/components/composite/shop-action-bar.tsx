import { Heart } from "lucide-react";
import { Button } from "@/components/ui-extended/button";
import { useBreakpoint } from "@/providers/breakpoint-provider";

interface LikeProps {
  count: number;
  isLiked: boolean;
  onToggle: () => void;
}

interface ShopActionBarProps {
  onOrder: () => void;
  disabled?: boolean;
  orderLabel?: string;
  disabledLabel?: string;
  onAddToCart?: () => void;
  cartLabel?: string;
  like?: LikeProps;
  "data-testid"?: string;
  "data-cart-testid"?: string;
}

function LikeButton({ like }: { like: LikeProps }) {
  const ariaLabel = like.isLiked ? "좋아요 취소" : "좋아요";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={like.onToggle}
      className="size-12 shrink-0"
      aria-label={ariaLabel}
      aria-pressed={like.isLiked}
    >
      <div className="flex flex-col items-center gap-1">
        <Heart className={like.isLiked ? "fill-red-500 text-red-500" : ""} />
        <span className="text-xs text-zinc-600 -mt-1">{like.count}</span>
      </div>
    </Button>
  );
}

export function ShopActionBar({
  onOrder,
  disabled,
  orderLabel = "주문하기",
  disabledLabel,
  onAddToCart,
  cartLabel = "장바구니",
  like,
  "data-testid": testId,
  "data-cart-testid": cartTestId,
}: ShopActionBarProps) {
  const { isMobile } = useBreakpoint();
  const primaryLabel = disabled && disabledLabel ? disabledLabel : orderLabel;

  if (isMobile) {
    return (
      <div className="flex gap-2 items-center">
        {like && <LikeButton like={like} />}
        <Button
          type="button"
          onClick={onOrder}
          size="xl"
          className="flex-1"
          disabled={disabled}
          data-testid={testId}
        >
          {primaryLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      {like && <LikeButton like={like} />}
      {onAddToCart && (
        <Button
          type="button"
          variant="outline"
          size="xl"
          onClick={onAddToCart}
          className="flex-1"
          disabled={disabled}
          data-testid={cartTestId}
        >
          {disabled && disabledLabel ? disabledLabel : cartLabel}
        </Button>
      )}
      <Button
        type="button"
        onClick={onOrder}
        size="xl"
        className="flex-1"
        disabled={disabled}
        data-testid={testId}
      >
        {primaryLabel}
      </Button>
    </div>
  );
}
