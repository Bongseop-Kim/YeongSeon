import { useState, forwardRef, useImperativeHandle } from "react";
import type { ProductCartItem } from "@/features/cart/types/cart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuantitySelector } from "@/components/composite/quantity-selector";

interface OptionChangeModalProps {
  item: ProductCartItem;
}

export interface OptionChangeModalRef {
  getValues: () => { quantity: number; optionId?: string };
}

export const OptionChangeModal = forwardRef<
  OptionChangeModalRef,
  OptionChangeModalProps
>(({ item }, ref) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [selectedOptionId, setSelectedOptionId] = useState(
    item.selectedOption?.id
  );

  useImperativeHandle(ref, () => ({
    getValues: () => ({
      quantity,
      optionId: selectedOptionId,
    }),
  }));

  const hasOptions = item.product.options && item.product.options.length > 0;

  const selectedOption = selectedOptionId
    ? item.product.options?.find((opt) => opt.id === selectedOptionId)
    : undefined;

  const itemPrice = item.product.price + (selectedOption?.additionalPrice || 0);
  const totalPrice = itemPrice * quantity;

  return (
    <div className="space-y-4">
      {/* 옵션 선택 */}
      {hasOptions && (
        <div className="space-y-2">
          <Select value={selectedOptionId} onValueChange={setSelectedOptionId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.product.options!.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                  {option.additionalPrice > 0 &&
                    ` (+${option.additionalPrice.toLocaleString()}원)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 수량 조절 */}
      <div className="space-y-2 bg-zinc-100 p-4 rounded-sm">
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          showPrice={true}
          totalPrice={totalPrice}
        />
      </div>
    </div>
  );
});

OptionChangeModal.displayName = "OptionChangeModal";
