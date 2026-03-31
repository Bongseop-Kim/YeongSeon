import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";
import { Package } from "lucide-react";
import { ItemPriceDisplay } from "@/shared/ui/item-price-display";

interface ReformItemInfoProps {
  item: ReformCartItem;
  image?: ReformCartItem["reformData"]["tie"]["image"] | null;
}

export function ReformItemInfo({ item, image }: ReformItemInfoProps) {
  const itemPrice = item.reformData.cost;
  const discount = calculateDiscount(itemPrice, item.appliedCoupon);
  const discountedPrice = itemPrice - discount;
  const imageUrl = typeof image === "string" ? image : null;

  return (
    <div className="flex gap-4">
      <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm bg-zinc-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="넥타이"
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-12 w-12 text-zinc-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-base font-medium">넥타이 수선</h3>
        <p className="text-sm text-zinc-500">
          {item.reformData.tie.measurementType === "length"
            ? `길이: ${item.reformData.tie.tieLength}cm`
            : `키: ${item.reformData.tie.wearerHeight}cm`}
        </p>
        <ItemPriceDisplay
          basePrice={itemPrice}
          discountedPrice={discountedPrice}
          couponName={item.appliedCoupon?.coupon.name}
          className="mt-2"
        />
      </div>
    </div>
  );
}
