import { Label } from "@/components/ui/label";
import { ImageViewer } from "@/components/composite/image-viewer";
import type { OrderItem } from "../types/view/order";
import { getOrderItemDetails } from "../utils/get-order-item-details";

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
  const content = (
    <div className={`flex gap-3 ${className}`}>
      {/* 이미지 */}
      {item.type === "product" && <ImageViewer image={item.product.image} />}

      {/* 상품 상세 정보 */}
      <div className="flex-1 text-left">
        <div className="flex flex-col gap-1">
          <Label className="font-bold">
            {item.type === "product" ? item.product.name : "넥타이 수선"}
          </Label>
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
              {showPrice && (
                <Label className="font-bold">
                  {item.type === "product"
                    ? (
                        (item.product.price +
                          (item.selectedOption?.additionalPrice ?? 0)) *
                        item.quantity
                      ).toLocaleString()
                    : (item.reformData.cost * item.quantity).toLocaleString()}
                  원
                </Label>
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
