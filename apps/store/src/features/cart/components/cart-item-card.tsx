import type { ProductCartItem } from "@yeongseon/shared/types/view/cart";
import { ProductItemInfo } from "@/shared/ui/product-item-info";
import { BaseCartItemCard } from "@/features/cart/components/base-cart-item-card";

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
    <BaseCartItemCard
      onRemove={onRemove}
      onChangeOption={onChangeOption}
      onChangeCoupon={onChangeCoupon}
      itemId={item.id}
    >
      <ProductItemInfo item={item} />
    </BaseCartItemCard>
  );
}
