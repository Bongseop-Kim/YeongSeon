import type { ProductCartItem } from "@yeongseon/shared/types/view/cart";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";
import { ItemPriceDisplay } from "@/shared/ui/item-price-display";

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
        <ItemPriceDisplay
          basePrice={totalPrice}
          discountedPrice={totalDiscountedPrice}
          couponName={item.appliedCoupon?.coupon.name}
        />
      </div>
    </div>
  );
}
