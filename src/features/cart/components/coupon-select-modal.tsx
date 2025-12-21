import { forwardRef, useImperativeHandle, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SAMPLE_COUPONS, type Coupon } from "@/features/order/types/coupon";
import { Separator } from "@/components/ui/separator";

export interface CouponSelectModalRef {
  getSelectedCoupon: () => Coupon | undefined;
}

interface CouponSelectModalProps {
  currentCouponId?: string;
}

export const CouponSelectModal = forwardRef<
  CouponSelectModalRef,
  CouponSelectModalProps
>(({ currentCouponId }, ref) => {
  const [selectedCouponId, setSelectedCouponId] = useState<string>(
    currentCouponId || "none"
  );

  useImperativeHandle(ref, () => ({
    getSelectedCoupon: () => {
      if (selectedCouponId === "none") return undefined;
      return SAMPLE_COUPONS.find((coupon) => coupon.id === selectedCouponId);
    },
  }));

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedCouponId}
        onValueChange={(value) => setSelectedCouponId(value)}
      >
        {/* 사용 안함 옵션 */}
        <Label htmlFor="coupon-none">
          <Card className="border rounded-sm cursor-pointer hover:border-primary transition-colors w-full">
            <CardContent className="p-4 ">
              {/* 위: 라디오 버튼 + 제목 */}
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="coupon-none" />
                <span className="font-semibold">사용 안 함</span>
              </div>

              <Separator className="my-3" />

              {/* 아래: 설명 */}
              <div className="text-sm text-zinc-500 pl-6">
                쿠폰을 사용하지 않습니다
              </div>
            </CardContent>
          </Card>
        </Label>

        {/* 쿠폰 목록 */}
        {SAMPLE_COUPONS.map((coupon) => (
          <Label key={coupon.id} htmlFor={`coupon-${coupon.id}`}>
            <Card className="border rounded-sm cursor-pointer hover:border-primary transition-colors w-full">
              <CardContent className="p-4">
                {/* 위: 라디오 버튼 + 쿠폰명 + 할인금액 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value={coupon.id}
                      id={`coupon-${coupon.id}`}
                    />
                    <span className="font-semibold">{coupon.name}</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {coupon.discountAmount}
                  </span>
                </div>

                <Separator className="my-3" />

                {/* 아래: 쿠폰 설명 */}
                <div className="pl-6 space-y-2">
                  <div className="text-sm text-zinc-600">
                    {coupon.description}
                  </div>
                  <div className="text-xs text-zinc-500">
                    유효기간: {coupon.expiryDate}
                  </div>
                  {coupon.additionalInfo && (
                    <div className="text-xs text-zinc-500">
                      {coupon.additionalInfo}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
});

CouponSelectModal.displayName = "CouponSelectModal";
