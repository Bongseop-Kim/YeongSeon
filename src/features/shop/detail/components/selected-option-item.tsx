import type { Product, ProductOption } from "@/features/shop/types/view/product";
import CloseButton from "@/components/ui/close";
import { QuantitySelector } from "@/components/composite/quantity-selector";

interface SelectedOption {
  option: ProductOption;
  quantity: number;
}

interface SelectedOptionItemProps {
  item: SelectedOption;
  product: Product;
  onRemove: () => void;
  onUpdateQuantity: (delta: number) => void;
  showCloseButton?: boolean;
}

export function SelectedOptionItem({
  item,
  product,
  onRemove,
  onUpdateQuantity,
  showCloseButton = true,
}: SelectedOptionItemProps) {
  return (
    <div className="relative flex justify-between items-start gap-4 p-3 border rounded-sm bg-zinc-100">
      <div className="flex flex-col gap-2 flex-1">
        <p className="text-sm font-semibold">{item.option.name}</p>
        <QuantitySelector
          value={item.quantity}
          onChange={(newQuantity) => {
            const delta = newQuantity - item.quantity;
            onUpdateQuantity(delta);
          }}
        />
      </div>

      <div className="flex flex-col items-end justify-end flex-shrink-0 self-stretch">
        <p className="text-sm font-semibold">
          {(product.price + item.option.additionalPrice).toLocaleString()}원
        </p>
      </div>

      {showCloseButton && (
        <div className="absolute top-1 right-1">
          <CloseButton onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}
