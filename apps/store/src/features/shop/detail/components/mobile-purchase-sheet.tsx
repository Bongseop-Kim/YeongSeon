import { Sheet, SheetContent, SheetTitle } from "@/shared/ui-extended/sheet";
import { SheetActionFooter } from "@/shared/composite/sheet-action-footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui-extended/select";
import type {
  Product,
  ProductOption,
} from "@yeongseon/shared/types/view/product";
import { SelectedOptionsList } from "./selected-options-list";
import { SelectedOptionItem } from "./selected-option-item";
import { toast } from "@/shared/lib/toast";
import { useState } from "react";
import type { SelectedOption } from "@/features/shop/detail/types/selected-option";

interface MobilePurchaseSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOptions: SelectedOption[];
  baseQuantity: number;
  handleSelectOption: (option: ProductOption) => void;
  handleRemoveOption: (optionId: string) => void;
  handleUpdateQuantity: (optionId: string, delta: number) => void;
  handleUpdateBaseQuantity: (delta: number, maxStock?: number | null) => void;
  resetOptions: () => void;
  isAddingToCart: boolean;
  onAddToCart: () => Promise<void>;
  onOrder: () => void;
}

export function MobilePurchaseSheet({
  product,
  open,
  onOpenChange,
  selectedOptions,
  baseQuantity,
  handleSelectOption,
  handleRemoveOption,
  handleUpdateQuantity,
  handleUpdateBaseQuantity,
  resetOptions,
  isAddingToCart,
  onAddToCart,
  onOrder,
}: MobilePurchaseSheetProps) {
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const productOptions = product.options ?? [];
  const hasOptions = productOptions.length > 0;

  const handleAddToCart = async () => {
    if (isAddingToCart) return;

    if (hasOptions && selectedOptions.length === 0) {
      toast.warning("옵션을 선택해주세요.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      await onAddToCart();
      resetOptions();
      onOpenChange(false);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleOrder = () => {
    onOpenChange(false);
    onOrder();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[60vh]">
        <SheetTitle className="sr-only">상품 구매</SheetTitle>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4">
          {hasOptions && (
            <Select
              value=""
              onValueChange={(value) => {
                const option = productOptions.find((o) => o.id === value);
                if (option) {
                  handleSelectOption(option);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    product.optionLabel
                      ? `${product.optionLabel}을(를) 선택하세요`
                      : "옵션을 선택하세요"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {productOptions
                  .filter(
                    (option) =>
                      !selectedOptions.some((s) => s.option.id === option.id),
                  )
                  .map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                      {option.additionalPrice > 0 &&
                        ` (+${option.additionalPrice.toLocaleString()}원)`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          {hasOptions && (
            <SelectedOptionsList
              selectedOptions={selectedOptions}
              product={product}
              onRemoveOption={handleRemoveOption}
              onUpdateQuantity={handleUpdateQuantity}
            />
          )}

          {!hasOptions && (
            <div className="space-y-3">
              <SelectedOptionItem
                item={{
                  option: {
                    id: "base",
                    name: product.name,
                    additionalPrice: 0,
                  },
                  quantity: baseQuantity,
                }}
                product={product}
                onRemove={() => {}}
                onUpdateQuantity={(delta) =>
                  handleUpdateBaseQuantity(delta, product.stock)
                }
                showCloseButton={false}
              />
            </div>
          )}
        </div>

        <SheetActionFooter
          onPrimary={handleAddToCart}
          onOrder={handleOrder}
          primaryLabel={
            isAddingToCart || isSubmittingOrder ? "추가 중..." : "장바구니"
          }
          primaryDisabled={
            isAddingToCart ||
            isSubmittingOrder ||
            (hasOptions && selectedOptions.length === 0)
          }
          orderDisabled={hasOptions && selectedOptions.length === 0}
        />
      </SheetContent>
    </Sheet>
  );
}
