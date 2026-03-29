import { Button } from "@/shared/ui-extended/button";
import type { ProductCartItem } from "@yeongseon/shared/types/view/cart";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";
import CloseButton from "@/shared/ui-extended/close";

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
  const totalPrice = itemPrice * item.quantity;
  const totalLineDiscount = calculateDiscount(
    itemPrice,
    item.appliedCoupon,
    item.quantity,
  );
  const totalDiscountedPrice = totalPrice - totalLineDiscount;
  const hasCoupon = !!item.appliedCoupon;

  return (
    <div>
      <div className="flex gap-4">
        <div className="w-24 h-24 flex-shrink-0 bg-zinc-100 rounded-sm overflow-hidden">
          <img
            src={item.product.image}
            alt={item.product.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">
                {item.product.name}
              </h3>
              <p className="text-sm text-zinc-500">{item.product.code}</p>

              <p className="text-sm text-zinc-500">
                {item.selectedOption && item.selectedOption.id !== "base"
                  ? item.selectedOption.name
                  : "FREE"}{" "}
                / {item.quantity}개
              </p>

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
