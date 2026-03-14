import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Product,
  ProductOption,
} from "@yeongseon/shared/types/view/product";
import type { SelectedOption } from "@/features/shop/detail/types/selected-option";
import { SelectedOptionsList } from "./selected-options-list";
import { SelectedOptionItem } from "./selected-option-item";
import { useAddToCartItems } from "@/features/cart/hooks/useAddToCartItems";
import { toast } from "@/lib/toast";

interface MobilePurchaseSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessOrder: (
    selectedOptions: SelectedOption[],
    baseQuantity: number,
  ) => void;
  selectedOptions: SelectedOption[];
  baseQuantity: number;
  handleSelectOption: (option: ProductOption) => void;
  handleRemoveOption: (optionId: string) => void;
  handleUpdateQuantity: (optionId: string, delta: number) => void;
  handleUpdateBaseQuantity: (delta: number, maxStock?: number | null) => void;
  resetOptions: () => void;
}

export function MobilePurchaseSheet({
  product,
  open,
  onOpenChange,
  onProcessOrder,
  selectedOptions,
  baseQuantity,
  handleSelectOption,
  handleRemoveOption,
  handleUpdateQuantity,
  handleUpdateBaseQuantity,
  resetOptions,
}: MobilePurchaseSheetProps) {
  const { addItemsToCart } = useAddToCartItems();
  const productOptions = product.options ?? [];

  const hasOptions = productOptions.length > 0;

  // 장바구니에 추가 중인지 여부
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const totalAmount = useMemo(() => {
    if (!hasOptions) {
      return product.price * baseQuantity;
    }

    return selectedOptions.reduce((sum, item) => {
      const optionPrice = product.price + item.option.additionalPrice;
      return sum + optionPrice * item.quantity;
    }, 0);
  }, [product.price, selectedOptions, hasOptions, baseQuantity]);

  const totalQuantity = useMemo(() => {
    if (!hasOptions) {
      return baseQuantity;
    }
    return selectedOptions.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedOptions, hasOptions, baseQuantity]);

  const grandTotal = totalAmount;

  const handleAddToCart = async () => {
    if (isAddingToCart) return;

    if (hasOptions && selectedOptions.length === 0) {
      toast.warning("옵션을 선택해주세요.");
      return;
    }

    setIsAddingToCart(true);
    try {
      const { succeeded, failed, total } = await addItemsToCart(product, {
        selectedOptions,
        baseQuantity,
        hasOptions,
      });

      if (failed === total) {
        toast.error("장바구니 추가에 실패했습니다.");
        return;
      }

      if (failed > 0) {
        toast.warning(
          `일부 옵션을 장바구니에 추가하지 못했습니다. (${succeeded}/${total}개 추가됨)`,
        );
      }

      resetOptions();
      onOpenChange(false);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleOrder = () => {
    onOpenChange(false);
    onProcessOrder(selectedOptions, baseQuantity);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[60vh]">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4">
          {/* 옵션 선택 */}
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

          {/* 선택된 옵션 목록 (옵션이 있을 때) */}
          {hasOptions && (
            <SelectedOptionsList
              selectedOptions={selectedOptions}
              product={product}
              onRemoveOption={handleRemoveOption}
              onUpdateQuantity={handleUpdateQuantity}
            />
          )}

          {/* 수량 선택 (옵션이 없을 때) */}
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

          <Separator />

          {/* 금액 정보 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>총 {totalQuantity}개</span>
              <span>{grandTotal.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0">
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={handleAddToCart}
              disabled={
                isAddingToCart || (hasOptions && selectedOptions.length === 0)
              }
              className="flex-1"
            >
              {isAddingToCart ? "추가 중..." : "장바구니"}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={handleOrder}
              disabled={hasOptions && selectedOptions.length === 0}
              className="flex-1"
            >
              주문하기
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
