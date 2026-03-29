import { Label } from "@/shared/ui/label";
import { ImageViewer } from "@/shared/composite/image-viewer";
import type { OrderItem } from "@yeongseon/shared/types/view/order";
import { getOrderItemDetails } from "@yeongseon/shared/utils/get-order-item-details";

interface OrderItemCardProps {
  item: OrderItem;
  onClick?: () => void;
  showQuantity?: boolean;
  showPrice?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function OrderItemCard({
  item,
  onClick,
  showQuantity = true,
  showPrice = true,
  actions,
  className = "",
}: OrderItemCardProps) {
  const isDeletedProduct =
    item.type === "product" && item.product.deleted === true;
  const itemLabel = getItemLabel(item);
  const itemPrice = getItemPrice(item, isDeletedProduct);

  const content = (
    <div className={`flex gap-3 ${className}`}>
      {/* 이미지 */}
      {item.type === "product" &&
        (isDeletedProduct ? (
          <div className="w-20 h-20 rounded-sm bg-zinc-100 flex items-center justify-center text-xs text-zinc-500">
            삭제됨
          </div>
        ) : (
          <ImageViewer image={item.product.image} />
        ))}

      {/* 상품 상세 정보 */}
      <div className="flex-1 text-left">
        <div className="flex flex-col gap-1">
          <Label className="font-bold">{itemLabel}</Label>
          <Label className="text-sm text-zinc-500">
            {getOrderItemDetails(item)}
          </Label>
          {(showQuantity || showPrice) && (
            <div className="flex items-center justify-between mt-1">
              {showQuantity && (
                <span className="text-sm text-zinc-500">
                  수량: {item.quantity}개
                </span>
              )}
              {showPrice && itemPrice && (
                <Label className="font-bold">{itemPrice}</Label>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {onClick ? (
        <button type="button" className="block w-full" onClick={onClick}>
          {content}
        </button>
      ) : (
        content
      )}
      {actions && actions}
    </div>
  );
}

function getItemLabel(item: OrderItem): string {
  switch (item.type) {
    case "product":
      return item.product.name;
    case "custom":
      return "주문 제작";
    case "sample":
      return "샘플 제작";
    case "token":
      return "토큰 구매";
    case "reform":
      return "넥타이 수선";
  }
}

function getItemPrice(
  item: OrderItem,
  isDeletedProduct: boolean,
): string | null {
  switch (item.type) {
    case "product":
      if (isDeletedProduct) {
        return "0원";
      }
      return `${(
        (item.product.price + (item.selectedOption?.additionalPrice ?? 0)) *
        item.quantity
      ).toLocaleString()}원`;
    case "custom":
      return `${item.customData.pricing.totalCost.toLocaleString()}원`;
    case "sample":
      return item.sampleData
        ? `${item.sampleData.pricing.totalCost.toLocaleString()}원`
        : null;
    case "reform":
      return `${(item.reformData.cost * item.quantity).toLocaleString()}원`;
    case "token":
      return null;
  }
}
