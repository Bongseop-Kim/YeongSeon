import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReformCartItem } from "@/types/cart";
import { calculateDiscount } from "@/types/coupon";
import { Package } from "lucide-react";

interface ReformOrderItemCardProps {
  item: ReformCartItem;
  onChangeCoupon: () => void;
}

export function ReformOrderItemCard({
  item,
  onChangeCoupon,
}: ReformOrderItemCardProps) {
  const itemPrice = item.reformData.cost;
  const discount = calculateDiscount(itemPrice, item.appliedCoupon);
  const discountedPrice = itemPrice - discount;
  const hasCoupon = !!item.appliedCoupon;

  return (
    <CardContent>
      <div className="flex gap-4">
        {/* 수선 아이콘 */}
        <div className="w-24 h-24 flex-shrink-0 bg-zinc-100 rounded-sm overflow-hidden flex items-center justify-center">
          <Package className="w-12 h-12 text-zinc-400" />
        </div>

        {/* 수선 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base">넥타이 수선</h3>

              {/* 수선 상세 정보 */}
              <p className="text-sm text-zinc-500">
                {item.reformData.tie.measurementType === "length"
                  ? `길이: ${item.reformData.tie.tieLength}cm`
                  : `키: ${item.reformData.tie.wearerHeight}cm`}
              </p>

              {/* 가격 표시 */}
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

              {/* 적용된 쿠폰 표시 */}
              {hasCoupon && (
                <p className="text-xs text-primary font-medium">
                  {item.appliedCoupon?.name} 적용
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={onChangeCoupon}
        >
          쿠폰 사용
        </Button>
      </div>
    </CardContent>
  );
}
