interface ItemPriceDisplayProps {
  basePrice: number;
  discountedPrice: number;
  couponName?: string;
  className?: string;
}

export function ItemPriceDisplay({
  basePrice,
  discountedPrice,
  couponName,
  className,
}: ItemPriceDisplayProps) {
  const hasCoupon = !!couponName;

  return (
    <div className={className}>
      {hasCoupon ? (
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-400 line-through">
            {basePrice.toLocaleString()}원
          </p>
          <p className="text-sm font-bold text-red-600">
            {discountedPrice.toLocaleString()}원
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium">{basePrice.toLocaleString()}원</p>
      )}
      {hasCoupon ? (
        <p className="text-xs font-medium text-primary">{couponName} 적용</p>
      ) : null}
    </div>
  );
}
