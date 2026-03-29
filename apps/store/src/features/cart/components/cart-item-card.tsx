import { Button } from "@/shared/ui-extended/button";
import type { ProductCartItem } from "@yeongseon/shared/types/view/cart";
import CloseButton from "@/shared/ui-extended/close";
import { ProductItemInfo } from "@/shared/ui/product-item-info";

interface CartItemCardProps {
  item: ProductCartItem;
  onRemove: () => void;
  onChangeOption: () => void;
  onChangeCoupon: () => void;
}

export function CartItemCard({
  item,
  onRemove,
  onChangeOption,
  onChangeCoupon,
}: CartItemCardProps) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between">
        <ProductItemInfo item={item} />
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
          data-testid={`cart-item-change-option-${item.id}`}
        >
          옵션 변경
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          size="sm"
          onClick={onChangeCoupon}
          data-testid={`cart-item-change-coupon-${item.id}`}
        >
          쿠폰 사용
        </Button>
      </div>
    </div>
  );
}
