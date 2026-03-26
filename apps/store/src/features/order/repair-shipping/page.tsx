import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
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
import { COURIER_COMPANIES } from "@yeongseon/shared/constants/courier-companies";
import { submitRepairTracking } from "@/features/order/api/order-api";
import { useOrderDetail } from "@/features/order/api/order-query";
import { toast } from "@/lib/toast";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { RepairShippingAddressBanner } from "@/features/order/components/repair-shipping-address-banner";

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
        <div className="mx-auto max-w-3xl px-4 py-6 lg:px-0 lg:py-10">
          <div className="space-y-8">
            <UtilityPageIntro
              eyebrow="Repair Shipping"
              title="수선품 발송 등록"
              description="결제가 완료되었습니다. 발송 주소를 확인한 뒤 송장번호를 등록해주세요."
              meta={
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  결제가 완료되었습니다. 수선품을 보내신 뒤 송장 정보를 남기면
                  접수가 바로 이어집니다.
                </div>
              }
            />

            <UtilityPageSection
              title="발송 주소"
              description="수선품을 보낼 때 아래 주소를 그대로 사용하면 됩니다."
            >
              <div className="border-t border-stone-200 pt-5">
                <RepairShippingAddressBanner />
              </div>
            </UtilityPageSection>

            <UtilityPageSection
              title="송장번호 등록"
              description="택배사를 선택하고 송장번호를 입력하면 발송 접수가 완료됩니다."
            >
              <div className="border-t border-stone-200 pt-5">
                <div className="space-y-3">
                  <Select
                    value={courierCompany}
                    onValueChange={setCourierCompany}
                  >
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      "발송 완료 등록"
                    )}
                  </Button>
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`)
                      }
                      className="text-sm text-zinc-500 underline"
                    >
                      나중에 주문 상세에서 등록하기
                    </button>
                  </div>
                </div>
              </div>
            </UtilityPageSection>
          </div>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default RepairShippingPage;
