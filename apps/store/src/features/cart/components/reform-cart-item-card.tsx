import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import { ReformItemInfo } from "@/shared/ui/reform-item-info";
import { BaseCartItemCard } from "@/features/cart/components/base-cart-item-card";

interface ReformCartItemCardProps {
  item: ReformCartItem;
  onRemove: () => void;
  onChangeOption: () => void;
  onChangeCoupon: () => void;
}

export function ReformCartItemCard({
  item,
  onRemove,
  onChangeOption,
  onChangeCoupon,
}: ReformCartItemCardProps) {
  return (
    <BaseCartItemCard
      onRemove={onRemove}
      onChangeOption={onChangeOption}
      onChangeCoupon={onChangeCoupon}
    >
      <ReformItemInfo item={item} />
    </BaseCartItemCard>
  );
}
