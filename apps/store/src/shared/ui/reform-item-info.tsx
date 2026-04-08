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
  const hasLengthReform = item.reformData.tie.hasLengthReform !== false;
  const hasWidthReform = item.reformData.tie.hasWidthReform === true;
  const serviceLabels = [
    hasLengthReform ? "자동수선" : null,
    hasWidthReform ? "폭수선" : null,
  ].filter((label): label is string => label !== null);
  const measurementText = hasLengthReform
    ? item.reformData.tie.measurementType === "length"
      ? `길이: ${item.reformData.tie.tieLength}cm`
      : `키: ${item.reformData.tie.wearerHeight}cm`
    : null;
  const widthText =
    hasWidthReform && item.reformData.tie.targetWidth != null
      ? `폭: ${item.reformData.tie.targetWidth}cm`
      : null;

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
        {serviceLabels.length > 0 ? (
          <p className="text-sm text-zinc-500">
            서비스: {serviceLabels.join(" · ")}
          </p>
        ) : null}
        {measurementText ? (
          <p className="text-sm text-zinc-500">{measurementText}</p>
        ) : null}
        {widthText ? (
          <p className="text-sm text-zinc-500">{widthText}</p>
        ) : null}
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
