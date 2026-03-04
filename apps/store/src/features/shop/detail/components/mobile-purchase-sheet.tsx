import { useState, useMemo } from "react";
import { useSelectedOptions } from "@/features/shop/detail/hooks/useSelectedOptions";
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
import type { Product } from "@yeongseon/shared/types/view/product";
import type { SelectedOption } from "@/features/shop/detail/types";
import { SelectedOptionsList } from "./selected-options-list";
import { SelectedOptionItem } from "./selected-option-item";
import { useCart } from "@/features/cart/hooks/useCart";
import { toast } from "@/lib/toast";

interface MobilePurchaseSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessOrder: (
    selectedOptions: SelectedOption[],
    baseQuantity: number
  ) => void;
}

export function MobilePurchaseSheet({
  product,
  open,
  onOpenChange,
  onProcessOrder,
}: MobilePurchaseSheetProps) {
  const { addToCart } = useCart();
  const {
    selectedOptions,
    baseQuantity,
    handleSelectOption,
    handleRemoveOption,
    handleUpdateQuantity,
    handleUpdateBaseQuantity,
    resetOptions,
  } = useSelectedOptions();
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

    if (hasOptions) {
      // 옵션이 있는 경우: 선택된 옵션이 있는지 확인
      if (selectedOptions.length === 0) {
        toast.warning("옵션을 선택해주세요.");
        return;
      }

      setIsAddingToCart(true);

      try {
        for (const selectedOption of selectedOptions) {
          await addToCart(product, {
            option: selectedOption.option,
            quantity: selectedOption.quantity,
            showModal: false,
          });
        }

        resetOptions();
      } catch {
        toast.error("장바구니 추가에 실패했습니다.");
        return;
      } finally {
        setIsAddingToCart(false);
      }
    } else {
      // 옵션이 없는 경우: baseQuantity로 추가
      setIsAddingToCart(true);
      try {
        await addToCart(product, { quantity: baseQuantity, showModal: false });

        resetOptions();
      } catch {
        toast.error("장바구니 추가에 실패했습니다.");
        return;
      } finally {
        setIsAddingToCart(false);
      }
    }

    onOpenChange(false);
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
                <SelectValue placeholder="길이를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {productOptions
                  .filter(
                    (option) =>
                      !selectedOptions.some((s) => s.option.id === option.id)
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
                onUpdateQuantity={(delta) => handleUpdateBaseQuantity(delta)}
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
