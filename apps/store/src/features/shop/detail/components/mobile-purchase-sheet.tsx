import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "@/components/ui-extended/sheet";
import { Button } from "@/components/ui-extended/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-extended/select";
import type { Product } from "@yeongseon/shared/types/view/product";
import { SelectedOptionsList } from "./selected-options-list";
import { SelectedOptionItem } from "./selected-option-item";
import { useAddToCartItems } from "@/features/cart/hooks/useAddToCartItems";
import { useModalStore } from "@/store/modal";
import { useOrderStore } from "@/store/order";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import { useSelectedOptions } from "@/features/shop/detail/hooks/useSelectedOptions";
import { processOrderAndNavigate } from "@/features/shop/detail/utils/process-order";
import { ROUTES } from "@/constants/ROUTES";
import { useState } from "react";

interface MobilePurchaseSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobilePurchaseSheet({
  product,
  open,
  onOpenChange,
}: MobilePurchaseSheetProps) {
  const { addItemsToCart } = useAddToCartItems();
  const { openModal } = useModalStore();
  const { setOrderItems } = useOrderStore();
  const navigate = useNavigate();
  const {
    selectedOptions,
    baseQuantity,
    handleSelectOption,
    handleRemoveOption,
    handleUpdateQuantity,
    handleUpdateBaseQuantity,
    resetOptions,
  } = useSelectedOptions();

  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const productOptions = product.options ?? [];
  const hasOptions = productOptions.length > 0;

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
      openModal({
        title: "장바구니",
        description: "장바구니에 추가되었습니다.",
        confirmText: "장바구니 보기",
        cancelText: "닫기",
        onConfirm: () => {
          window.location.href = ROUTES.CART;
        },
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleOrder = () => {
    onOpenChange(false);
    processOrderAndNavigate(
      product,
      selectedOptions,
      baseQuantity,
      setOrderItems,
      navigate,
    );
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
