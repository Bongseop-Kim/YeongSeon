import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty } from "@/components/composite/empty";
import { Separator } from "@/components/ui/separator";
import { CartItemCard } from "@/features/cart/components/cart-item-card";
import { ReformCartItemCard } from "@/features/cart/components/reform-cart-item-card";
import type { CartItem } from "@/features/cart/types/view/cart";

interface CartItemsPanelProps {
  items: CartItem[];
  selectedItems: string[];
  onSelectItem: (itemId: string, checked: boolean) => void;
  onRemoveProductItem: (itemId: string) => void;
  onRemoveReformItem: (itemId: string) => void;
  onChangeProductOption: (itemId: string) => void;
  onChangeReformOption: (itemId: string) => void;
  onChangeCoupon: (itemId: string) => void;
}

export function CartItemsPanel({
  items,
  selectedItems,
  onSelectItem,
  onRemoveProductItem,
  onRemoveReformItem,
  onChangeProductOption,
  onChangeReformOption,
  onChangeCoupon,
}: CartItemsPanelProps) {
  if (items.length === 0) {
    return (
      <Empty
        title="장바구니가 비어있습니다."
        description="쇼핑을 계속해보세요!"
      />
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <div className="flex gap-3 p-4">
            <Checkbox
              checked={selectedItems.includes(item.id)}
              onCheckedChange={(checked) =>
                onSelectItem(item.id, checked === true)
              }
            />
            <div className="flex-1">
              {item.type === "product" ? (
                <CartItemCard
                  item={item}
                  onRemove={() => onRemoveProductItem(item.id)}
                  onChangeOption={() => onChangeProductOption(item.id)}
                  onChangeCoupon={() => onChangeCoupon(item.id)}
                />
              ) : (
                <ReformCartItemCard
                  item={item}
                  onRemove={() => onRemoveReformItem(item.id)}
                  onChangeOption={() => onChangeReformOption(item.id)}
                  onChangeCoupon={() => onChangeCoupon(item.id)}
                />
              )}
            </div>
          </div>
          {index < items.length - 1 && <Separator />}
        </React.Fragment>
      ))}
    </div>
  );
}
