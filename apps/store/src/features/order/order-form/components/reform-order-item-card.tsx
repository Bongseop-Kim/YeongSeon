import { useEffect, useState } from "react";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui-extended/button";
import { Input } from "@/shared/ui-extended/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import { COURIER_COMPANIES } from "@yeongseon/shared/constants/courier-companies";
import { useOrderStore } from "@/shared/store/order";
import { RepairShippingAddressBanner } from "@/features/order/components/repair-shipping-address-banner";
import { ReformItemInfo } from "@/shared/ui/reform-item-info";

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

  const hasCoupon = !!item.appliedCoupon;
  const tieImage =
    typeof item.reformData.tie.image === "string"
      ? item.reformData.tie.image
      : null;

  useEffect(() => {
    updateOrderItemTracking(
      item.id,
      courierCompany || trackingNumber
        ? { courierCompany, trackingNumber }
        : undefined,
    );
  }, [courierCompany, trackingNumber, item.id, updateOrderItemTracking]);

  return (
    <div className="py-5">
      <ReformItemInfo item={item} image={tieImage} />

      <div className="mt-2 flex gap-2">
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

      <RepairShippingAddressBanner />

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
    </div>
  );
}
