import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui-extended/button";
import { Input } from "@/components/ui-extended/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { Loader2 } from "lucide-react";
import { REPAIR_SHIPPING_ADDRESS } from "@/constants/REPAIR_SHIPPING";
import { COURIER_COMPANIES } from "@yeongseon/shared/constants/courier-companies";
import { submitRepairTracking } from "@/features/order/api/order-api";
import { useOrderDetail } from "@/features/order/api/order-query";
import { toast } from "@/lib/toast";

interface PrefilledTracking {
  courierCompany: string;
  trackingNumber: string;
}

interface LocationState {
  prefilledTracking?: PrefilledTracking | null;
}

const RepairShippingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const prefilled = state?.prefilledTracking ?? null;

  const [courierCompany, setCourierCompany] = useState(
    prefilled?.courierCompany ?? "",
  );
  const [trackingNumber, setTrackingNumber] = useState(
    prefilled?.trackingNumber ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { order, isLoading } = useOrderDetail(orderId);

  // 발송대기 아닌 상태면 주문 상세로 리다이렉트
  useEffect(() => {
    if (!isLoading && (!order || order.status !== "발송대기")) {
      navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`, { replace: true });
    }
  }, [order, isLoading, navigate, orderId]);

  const handleCopyAddress = async () => {
    try {
      const text = `${REPAIR_SHIPPING_ADDRESS.recipient} / ${REPAIR_SHIPPING_ADDRESS.address} / ${REPAIR_SHIPPING_ADDRESS.phone}`;
      await navigator.clipboard.writeText(text);
      toast.success("주소가 복사되었습니다.");
    } catch {
      toast.error("주소 복사에 실패했습니다. 수동으로 복사해주세요.");
    }
  };

  const handleSubmit = async () => {
    if (!orderId) return;
    if (!courierCompany) {
      toast.error("택배사를 선택해주세요.");
      return;
    }
    if (!trackingNumber.trim()) {
      toast.error("송장번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRepairTracking(
        orderId,
        courierCompany,
        trackingNumber.trim(),
      );
      toast.success("발송 처리가 완료되었습니다.");
      navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`, { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "발송 처리에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (!order || order.status !== "발송대기") {
    return null;
  }

  return (
    <MainLayout>
      <MainContent>
        <div className="max-w-lg mx-auto py-8 px-4 space-y-4">
          {/* 결제 완료 배너 (PurchaseConfirmSection 성공 상태와 동일 스타일) */}
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            결제가 완료되었습니다.
          </div>

          {/* 발송 주소 카드 (ShippingInfoSection 라벨-값 패턴) */}
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">발송 주소</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopyAddress}>
                  주소 복사
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-zinc-500">받는분:</span>{" "}
                {REPAIR_SHIPPING_ADDRESS.recipient}
              </p>
              <p>
                <span className="text-zinc-500">주소:</span>{" "}
                {REPAIR_SHIPPING_ADDRESS.address}
              </p>
              <p>
                <span className="text-zinc-500">연락처:</span>{" "}
                {REPAIR_SHIPPING_ADDRESS.phone}
              </p>
            </CardContent>
          </Card>

          {/* 송장번호 등록 카드 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">송장번호 등록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <Input
                type="text"
                placeholder="송장번호를 입력해주세요"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  isSubmitting || !courierCompany || !trackingNumber.trim()
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  "발송 완료 등록"
                )}
              </Button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`)}
                  className="text-sm text-zinc-500 underline"
                >
                  나중에 주문 상세에서 등록하기
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default RepairShippingPage;
