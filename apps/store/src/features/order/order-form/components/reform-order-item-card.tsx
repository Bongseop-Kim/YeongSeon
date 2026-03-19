import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";
import { Package } from "lucide-react";
import { REPAIR_SHIPPING_ADDRESS } from "@/constants/REPAIR_SHIPPING";
import { COURIER_COMPANIES } from "@yeongseon/shared/constants/courier-companies";
import { useOrderStore } from "@/store/order";
import { toast } from "@/lib/toast";

interface ReformOrderItemCardProps {
  item: ReformCartItem;
  onChangeCoupon: () => void;
}

export function ReformOrderItemCard({
  item,
  onChangeCoupon,
}: ReformOrderItemCardProps) {
  const [alreadyShipped, setAlreadyShipped] = useState(false);
  const [courierCompany, setCourierCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const { updateOrderItemTracking } = useOrderStore();

  const itemPrice = item.reformData.cost;
  const discount = calculateDiscount(itemPrice, item.appliedCoupon);
  const discountedPrice = itemPrice - discount;
  const hasCoupon = !!item.appliedCoupon;

  const handleCopyAddress = async () => {
    try {
      const text = `${REPAIR_SHIPPING_ADDRESS.recipient} / ${REPAIR_SHIPPING_ADDRESS.address} / ${REPAIR_SHIPPING_ADDRESS.phone}`;
      await navigator.clipboard.writeText(text);
      toast.success("주소가 복사되었습니다.");
    } catch {
      toast.error("주소 복사에 실패했습니다. 수동으로 복사해주세요.");
    }
  };

  const handleAlreadyShippedChange = (checked: boolean) => {
    setAlreadyShipped(checked);
    if (!checked) {
      setCourierCompany("");
      setTrackingNumber("");
      updateOrderItemTracking(item.id, undefined);
    }
  };

  const handleTrackingChange = (newCourier: string, newTracking: string) => {
    if (newCourier && newTracking) {
      updateOrderItemTracking(item.id, {
        courierCompany: newCourier,
        trackingNumber: newTracking,
      });
    } else {
      updateOrderItemTracking(item.id, undefined);
    }
  };

  return (
    <CardContent>
      <div className="flex gap-4">
        {/* 수선 이미지 또는 아이콘 */}
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

        {/* 수선 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
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
        </div>
      </div>

      {/* 발송 안내 블록 */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm font-semibold text-blue-800 mb-1">
          📮 수선품 발송 안내
        </p>
        <p className="text-xs text-blue-700 mb-2">
          결제 후 아래 주소로 넥타이를 발송해 주세요
        </p>
        <div className="rounded-md bg-white p-2 text-xs mb-2">
          <p className="font-semibold">{REPAIR_SHIPPING_ADDRESS.recipient}</p>
          <p className="text-zinc-600">{REPAIR_SHIPPING_ADDRESS.address}</p>
          <p className="text-zinc-600">{REPAIR_SHIPPING_ADDRESS.phone}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={handleCopyAddress}
        >
          주소 복사
        </Button>
      </div>

      {/* 이미 발송 옵션 */}
      <div className="mt-3 rounded-lg border border-dashed border-zinc-300 p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={alreadyShipped}
            onChange={(e) => handleAlreadyShippedChange(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300"
          />
          <span className="text-sm font-medium">
            이미 넥타이를 발송했어요 (송장번호 미리 입력)
          </span>
        </label>

        {alreadyShipped && (
          <div className="mt-2 flex gap-2">
            <select
              value={courierCompany}
              onChange={(e) => {
                setCourierCompany(e.target.value);
                handleTrackingChange(e.target.value, trackingNumber);
              }}
              className="flex-1 text-sm rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5"
            >
              <option value="">택배사 선택</option>
              {COURIER_COMPANIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="송장번호"
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value);
                handleTrackingChange(courierCompany, e.target.value);
              }}
              className="flex-[2] text-sm rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5"
            />
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={onChangeCoupon}
        >
          {hasCoupon ? "쿠폰 변경" : "쿠폰 사용"}
        </Button>
      </div>
    </CardContent>
  );
}
