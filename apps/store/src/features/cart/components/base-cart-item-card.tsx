import type { ReactNode } from "react";
import { Button } from "@/shared/ui-extended/button";
import CloseButton from "@/shared/ui-extended/close";

interface BaseCartItemCardProps {
  children: ReactNode;
  onRemove: () => void;
  onChangeOption: () => void;
  onChangeCoupon: () => void;
  itemId?: string;
}

export function BaseCartItemCard({
  children,
  onRemove,
  onChangeOption,
  onChangeCoupon,
  itemId,
}: BaseCartItemCardProps) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between">
        {children}
        <CloseButton
          onRemove={onRemove}
          className="-mr-2 -mt-2 flex-shrink-0"
          variant="none"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          size="sm"
          onClick={onChangeOption}
          {...(itemId
            ? { "data-testid": `cart-item-change-option-${itemId}` }
            : {})}
        >
          옵션 변경
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          size="sm"
          onClick={onChangeCoupon}
          {...(itemId
            ? { "data-testid": `cart-item-change-coupon-${itemId}` }
            : {})}
        >
          쿠폰 사용
        </Button>
      </div>
    </div>
  );
}
