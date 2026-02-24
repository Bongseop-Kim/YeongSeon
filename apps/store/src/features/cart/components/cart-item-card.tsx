import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProductCartItem } from "@/features/cart/types/view/cart";
import { calculateDiscount } from "@/features/order/utils/calculate-discount";
import CloseButton from "@/components/ui/close";

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
  const itemPrice =
    item.product.price + (item.selectedOption?.additionalPrice || 0);
  const discount = calculateDiscount(itemPrice, item.appliedCoupon);
  const discountedPrice = itemPrice - discount;
  const totalPrice = itemPrice * item.quantity;
  const totalDiscountedPrice = discountedPrice * item.quantity;
  const hasCoupon = !!item.appliedCoupon;
  const hasUnavailableCoupon = !hasCoupon && !!item.appliedCouponId;

  return (
    <CardContent>
      <div className="flex gap-4">
        {/* 상품 이미지 */}
        <div className="w-24 h-24 flex-shrink-0 bg-zinc-100 rounded-sm overflow-hidden">
          <img
            src={item.product.image}
            alt={item.product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">
                {item.product.name}
              </h3>
              <p className="text-sm text-zinc-500">{item.product.code}</p>

              {/* 선택된 옵션 */}
              <p className="text-sm text-zinc-500">
                {item.selectedOption && item.selectedOption.id !== "base"
                  ? item.selectedOption.name
                  : "FREE"}{" "}
                / {item.quantity}개
              </p>

              {/* 가격 표시 */}
              {hasCoupon ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium line-through text-zinc-400">
                    {totalPrice.toLocaleString()}원
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    {totalDiscountedPrice.toLocaleString()}원
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium">
                  {totalPrice.toLocaleString()}원
                </p>
              )}

              {/* 적용된 쿠폰 표시 */}
              {hasCoupon ? (
                <p className="text-xs text-primary font-medium">
                  {item.appliedCoupon?.coupon?.name ?? "쿠폰"} 적용
                </p>
              ) : hasUnavailableCoupon ? (
                <p className="text-xs text-amber-600 font-medium">
                  쿠폰이 만료/사용되어 적용이 해제되었습니다
                </p>
              ) : null}
            </div>

            <CloseButton
              onRemove={onRemove}
              className="flex-shrink-0 -mt-2 -mr-2"
              variant="none"
            />
          </div>
        </div>
      </div>

      {/* 액션 버튼들 */}
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
    </CardContent>
  );
}
