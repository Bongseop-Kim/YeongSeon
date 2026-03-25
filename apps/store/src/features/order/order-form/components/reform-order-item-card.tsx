import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui-extended/button";
import { Input } from "@/components/ui-extended/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";
import { Package } from "lucide-react";
import { COURIER_COMPANIES } from "@yeongseon/shared/constants/courier-companies";
import { useOrderStore } from "@/store/order";
import { RepairShippingAddressBanner } from "@/features/order/components/repair-shipping-address-banner";

interface ReformOrderItemCardProps {
  item: ReformCartItem;
  onChangeCoupon: () => void;
}

export function ReformOrderItemCard({
  item,
  onChangeCoupon,
}: ReformOrderItemCardProps) {
  const [courierCompany, setCourierCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const { updateOrderItemTracking } = useOrderStore();

  const itemPrice = item.reformData.cost;
  const discount = calculateDiscount(itemPrice, item.appliedCoupon);
  const discountedPrice = itemPrice - discount;
  const hasCoupon = !!item.appliedCoupon;

  useEffect(() => {
    updateOrderItemTracking(
      item.id,
      courierCompany || trackingNumber
        ? { courierCompany, trackingNumber }
        : undefined,
    );
  }, [courierCompany, trackingNumber, item.id, updateOrderItemTracking]);

  return (
    <CardContent>
      {/* 아이템 정보 */}
      <div className="flex gap-4">
        <div className="w-24 h-24 flex-shrink-0 bg-zinc-100 rounded-sm overflow-hidden flex items-center justify-center">
          {typeof item.reformData.tie.image === "string" ? (
            <img
              src={item.reformData.tie.image}
              alt="넥타이"
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="w-12 h-12 text-zinc-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-base">넥타이 수선</h3>
          <p className="text-sm text-zinc-500">
            {item.reformData.tie.measurementType === "length"
              ? `길이: ${item.reformData.tie.tieLength}cm`
              : `키: ${item.reformData.tie.wearerHeight}cm`}
          </p>
          {hasCoupon ? (
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm font-medium line-through text-zinc-400">
                {itemPrice.toLocaleString()}원
              </p>
              <p className="text-sm font-bold text-red-600">
                {discountedPrice.toLocaleString()}원
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium mt-2">
              {itemPrice.toLocaleString()}원
            </p>
          )}
          {hasCoupon && (
            <p className="text-xs text-primary font-medium">
              {item.appliedCoupon?.coupon.name} 적용
            </p>
          )}
        </div>
      </div>

      {/* 쿠폰 버튼 */}
      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={onChangeCoupon}
        >
          {hasCoupon ? "쿠폰 변경" : "쿠폰 사용"}
        </Button>
      </div>

      <Separator className="my-3" />

      {/* 발송 주소 */}
      <RepairShippingAddressBanner />

      {/* 송장번호 미리 입력 */}
      <div className="space-y-2 mt-4">
        <p className="text-sm font-semibold text-zinc-700">
          이미 발송하셨나요?
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={courierCompany} onValueChange={setCourierCompany}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="택배사 선택" />
              </SelectTrigger>
              <SelectContent>
                {COURIER_COMPANIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="text"
            placeholder="송장번호"
            value={trackingNumber}
            className="flex-[2]"
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </div>
      </div>
    </CardContent>
  );
}
