import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCouponAmount } from "@/features/order/utils/format-coupon-amount";
import type { AppliedCoupon, UserCoupon } from "@/features/order/types/coupon";
import { Separator } from "@/components/ui/separator";
import { useUserCoupons } from "@/features/order/api/coupons.query";

export interface CouponSelectModalRef {
  getSelectedCoupon: () => AppliedCoupon | undefined;
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
  const { data: coupons, isLoading, isError } = useUserCoupons();

  const availableCoupons = useMemo<UserCoupon[]>(
    () => coupons ?? [],
    [coupons]
  );

  useEffect(() => {
    // 아직 쿠폰 목록 로딩 전(초기 undefined -> [])에 선택을 강제로 none으로 리셋하지 않도록 방어
    if (isLoading) return;

    // 부모에서 currentCouponId가 없으면 '사용 안 함'으로 동기화
    if (!currentCouponId) {
      setSelectedCouponId("none");
      return;
    }

    const exists = availableCoupons.some((c) => c.id === currentCouponId);
    setSelectedCouponId(exists ? currentCouponId : "none");
  }, [isLoading, availableCoupons, currentCouponId]);

  useImperativeHandle(ref, () => ({
    getSelectedCoupon: () => {
      if (selectedCouponId === "none") return undefined;
      return availableCoupons.find((coupon) => coupon.id === selectedCouponId);
    },
  }));

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-zinc-500">쿠폰을 불러오는 중...</div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-500">
        쿠폰을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }
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

        {/* 쿠폰이 없는 경우 */}
        {availableCoupons.length === 0 && (
          <Card className="border rounded-sm">
            <CardContent className="p-4 text-sm text-zinc-500">
              사용 가능한 쿠폰이 없습니다.
            </CardContent>
          </Card>
        )}

        {/* 쿠폰 목록 */}
        {availableCoupons.map((coupon) => (
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
                    <span className="font-semibold">{coupon.coupon.name}</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {formatCouponAmount(coupon.coupon)}
                  </span>
                </div>

                <Separator className="my-3" />

                {/* 아래: 쿠폰 설명 */}
                <div className="pl-6 space-y-2">
                  <div className="text-sm text-zinc-600">
                    {coupon.coupon.description}
                  </div>
                  <div className="text-xs text-zinc-500">
                    유효기간: {coupon.expiresAt || coupon.coupon.expiryDate}
                  </div>
                  {coupon.coupon.additionalInfo && (
                    <div className="text-xs text-zinc-500">
                      {coupon.coupon.additionalInfo}
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
