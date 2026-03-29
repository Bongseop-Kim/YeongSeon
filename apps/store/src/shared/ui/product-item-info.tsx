import type { ProductCartItem } from "@yeongseon/shared/types/view/cart";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";

interface ProductItemInfoProps {
  item: ProductCartItem;
}

export function ProductItemInfo({ item }: ProductItemInfoProps) {
  const itemPrice =
    item.product.price + (item.selectedOption?.additionalPrice ?? 0);
  const totalPrice = itemPrice * item.quantity;
  const totalLineDiscount = calculateDiscount(
    itemPrice,
    item.appliedCoupon,
    item.quantity,
  );
  const totalDiscountedPrice = totalPrice - totalLineDiscount;
  const hasCoupon = !!item.appliedCoupon;

  return (
    <div className="flex gap-4">
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-sm bg-zinc-100">
        <img
          src={item.product.image}
          alt={item.product.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-medium">{item.product.name}</h3>
        <p className="text-sm text-zinc-500">{item.product.code}</p>
        <p className="text-sm text-zinc-500">
          {item.selectedOption && item.selectedOption.id !== "base"
            ? item.selectedOption.name
            : "FREE"}{" "}
          / {item.quantity}개
        </p>

        {hasCoupon ? (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-400 line-through">
              {totalPrice.toLocaleString()}원
            </p>
            <p className="text-sm font-bold text-red-600">
              {totalDiscountedPrice.toLocaleString()}원
            </p>
          </div>
        ) : (
          <p className="text-sm font-medium">{totalPrice.toLocaleString()}원</p>
        )}

        {hasCoupon ? (
          <p className="text-xs font-medium text-primary">
            {item.appliedCoupon?.coupon.name ?? ""} 적용
          </p>
        ) : null}
      </div>
    </div>
  );
}
