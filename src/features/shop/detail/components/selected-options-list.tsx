import type { Product, ProductOption } from "@/features/shop/types/view/product";
import { SelectedOptionItem } from "./selected-option-item";

interface SelectedOption {
  option: ProductOption;
  quantity: number;
}

interface SelectedOptionsListProps {
  selectedOptions: SelectedOption[];
  product: Product;
  onRemoveOption: (optionId: string) => void;
  onUpdateQuantity: (optionId: string, delta: number) => void;
}

export function SelectedOptionsList({
  selectedOptions,
  product,
  onRemoveOption,
  onUpdateQuantity,
}: SelectedOptionsListProps) {
  if (selectedOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">선택된 옵션</p>
      {selectedOptions.map((item) => (
        <SelectedOptionItem
          key={item.option.id}
          item={item}
          product={product}
          onRemove={() => onRemoveOption(item.option.id)}
          onUpdateQuantity={(delta) => onUpdateQuantity(item.option.id, delta)}
        />
      ))}
    </div>
  );
}
