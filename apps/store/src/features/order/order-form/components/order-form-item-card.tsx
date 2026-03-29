import { Button } from "@/shared/ui-extended/button";
import type { ProductCartItem } from "@yeongseon/shared/types/view/cart";
import { ProductItemInfo } from "@/shared/ui/product-item-info";

interface OrderFormItemCardProps {
  item: ProductCartItem;
  onChangeCoupon: () => void;
}

export function OrderFormItemCard({
  item,
  onChangeCoupon,
}: OrderFormItemCardProps) {
  const hasCoupon = !!item.appliedCoupon;

  return (
    <div className="py-5">
      <ProductItemInfo item={item} />

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={onChangeCoupon}
        >
          {hasCoupon ? "쿠폰 변경" : "쿠폰 사용"}
        </Button>
      </div>
    </div>
  );
}
