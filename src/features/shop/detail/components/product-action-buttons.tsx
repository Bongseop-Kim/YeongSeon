import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Heart } from "lucide-react";

interface ProductActionButtonsProps {
  likes: number;
  isLiked: boolean;
  onLikeToggle: () => void;
  onAddToCart: () => void;
  onOrder: () => void;
}

export function ProductActionButtons({
  likes,
  isLiked,
  onLikeToggle,
  onAddToCart,
  onOrder,
}: ProductActionButtonsProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex gap-2 items-center">
        <div className="flex flex-col items-center shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onLikeToggle}
          >
            <Heart className={isLiked ? "fill-red-500 text-red-500" : ""} />
          </Button>
          <span className="text-xs text-zinc-600 -mt-1">{likes}</span>
        </div>
        <Button type="button" onClick={onOrder} size="xl" className="flex-1">
          구매하기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-12"
        onClick={onLikeToggle}
      >
        <div className="flex flex-col items-center shrink-0 gap-1">
          <Heart className={isLiked ? "fill-red-500 text-red-500" : ""} />
          <span className="text-xs text-zinc-600 -mt-1">{likes}</span>
        </div>
      </Button>

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
