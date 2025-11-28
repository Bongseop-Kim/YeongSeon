import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import type { Product, ProductOption } from "../../types/product";
import CloseButton from "@/components/ui/close";

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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(-1)}
            className="h-8 w-8"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(1)}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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
