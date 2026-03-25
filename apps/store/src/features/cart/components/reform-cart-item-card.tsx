import { Button } from "@/components/ui-extended/button";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";
import CloseButton from "@/components/ui-extended/close";
import { Package } from "lucide-react";

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
  const itemPrice = item.reformData.cost;
  const discount = calculateDiscount(itemPrice, item.appliedCoupon);
  const discountedPrice = itemPrice - discount;
  const hasCoupon = !!item.appliedCoupon;

  return (
    <div className="py-5">
      <div className="flex gap-4">
        <div className="w-24 h-24 flex-shrink-0 bg-zinc-100 rounded-sm overflow-hidden flex items-center justify-center">
          <Package className="w-12 h-12 text-zinc-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base">넥타이 수선</h3>

              <p className="text-sm text-zinc-500">
                {item.reformData.tie.measurementType === "length"
                  ? `길이: ${item.reformData.tie.tieLength}cm`
                  : `키: ${item.reformData.tie.wearerHeight}cm`}
              </p>

              {hasCoupon ? (
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-sm font-medium line-through text-zinc-400">
                    {itemPrice.toLocaleString()}원
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    {discountedPrice.toLocaleString()}원
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium mt-2">
                  {itemPrice.toLocaleString()}원
                </p>
              )}

              {hasCoupon && (
                <p className="text-xs text-primary font-medium">
                  {item.appliedCoupon?.coupon.name ?? ""} 적용
                </p>
              )}
            </div>

            <CloseButton
              onRemove={onRemove}
              className="flex-shrink-0 -mt-2 -mr-2"
              variant="none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          className="flex-1"
          size="sm"
          onClick={onChangeOption}
        >
          옵션 변경
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          size="sm"
          onClick={onChangeCoupon}
        >
          쿠폰 사용
        </Button>
      </div>
    </div>
  );
}
