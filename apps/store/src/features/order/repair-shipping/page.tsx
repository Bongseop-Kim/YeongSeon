import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    if (!isLoading && order && order.status !== "발송대기") {
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

  return (
    <MainLayout>
      <MainContent>
        <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
          {/* 결제 완료 헤더 */}
          <div className="text-center">
            <p className="text-2xl mb-1">✅</p>
            <h1 className="text-xl font-bold">결제가 완료되었습니다</h1>
            <p className="text-sm text-zinc-500 mt-1">
              수선품을 아래 주소로 발송해 주세요
            </p>
          </div>

          {/* 발송 안내 카드 */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-800">
                📮 수선품 발송 주소
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-white p-3 text-sm">
                <p className="font-semibold">
                  {REPAIR_SHIPPING_ADDRESS.recipient}
                </p>
                <p className="text-zinc-600 mt-0.5">
                  {REPAIR_SHIPPING_ADDRESS.address}
                </p>
                <p className="text-zinc-600">{REPAIR_SHIPPING_ADDRESS.phone}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleCopyAddress}
              >
                주소 복사
              </Button>
            </CardContent>
          </Card>

          {/* 송장번호 등록 폼 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">송장번호 등록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={courierCompany}
                onChange={(e) => setCourierCompany(e.target.value)}
                className="w-full text-sm rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2"
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
                placeholder="송장번호를 입력해주세요"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full text-sm rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2"
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
            </CardContent>
          </Card>

          {/* 나중에 등록 */}
          <div className="text-center">
            <p className="text-xs text-zinc-400 mb-2">
              나중에 주문 상세에서도 등록할 수 있어요
            </p>
            <button
              type="button"
              onClick={() => navigate(ROUTES.ORDER_LIST)}
              className="text-sm text-zinc-500 underline"
            >
              주문 내역 보기
            </button>
          </div>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default RepairShippingPage;
