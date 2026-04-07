import { Button } from "@/shared/ui-extended/button";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import { ReformItemInfo } from "@/shared/ui/reform-item-info";

interface ReformOrderItemCardProps {
  item: ReformCartItem;
  onChangeCoupon: () => void;
}

export function ReformOrderItemCard({
  item,
  onChangeCoupon,
}: ReformOrderItemCardProps) {
  const hasCoupon = !!item.appliedCoupon;

  return (
    <div className="py-5">
      <ReformItemInfo item={item} image={item.reformData.tie.image} />

      <div className="mt-2 flex gap-2">
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
