import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronLeft } from "lucide-react";
import { ROUTES } from "@/constants/ROUTES";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui-extended/button";
import { type PaymentWidgetRef } from "@/components/composite/payment-widget";
import { UtilityPageIntro } from "@/components/composite/utility-page";
import { OrderSummaryAside } from "@/components/composite/order-summary-aside";
import { PaymentActionBar } from "@/components/composite/payment-action-bar";
import { PaymentWidgetAside } from "@/components/composite/payment-widget-aside";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { hasStringCode } from "@/lib/type-guard";
import type { TokenPlanKey } from "@/features/token-purchase/api/token-purchase-api";
import { useTokenPlansQuery } from "@/features/token-purchase/api/token-purchase-query";

interface TokenPaymentPageState {
  purchaseInfo: {
    paymentGroupId: string;
  };
  planKey: TokenPlanKey;
}

interface TokenPaymentPageProps {
  onRequestPayment: () => void;
  registerProceedToPayment: (handler: () => Promise<void>) => void;
}

const noopProceedToPayment = async () => {};

const TokenPaymentPage = ({
  onRequestPayment,
  registerProceedToPayment,
}: TokenPaymentPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const isRequestingRef = useRef(false);
  const [withdrawalConsent, setWithdrawalConsent] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const {
    data: tokenPlans,
    isLoading: isPlansLoading,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useTokenPlansQuery();

  const state = location.state as TokenPaymentPageState | null;
  const purchaseInfo = state?.purchaseInfo ?? null;
  const selectedPlan = useMemo(
    () => tokenPlans?.find((plan) => plan.planKey === state?.planKey),
    [tokenPlans, state?.planKey],
  );

  useEffect(() => {
    if (!purchaseInfo) {
      navigate(ROUTES.TOKEN_PURCHASE, { replace: true });
    }
  }, [purchaseInfo, navigate]);

  useEffect(() => {
    if (!purchaseInfo) return;
    if (!isPlansLoading && tokenPlans && !selectedPlan) {
      navigate(ROUTES.TOKEN_PURCHASE, { replace: true });
    }
  }, [isPlansLoading, navigate, purchaseInfo, tokenPlans, selectedPlan]);

  const label = selectedPlan?.label ?? "";
  const features = selectedPlan?.features ?? [];
  const popular = selectedPlan?.popular ?? false;
  const price = selectedPlan?.price;
  const tokenAmount = selectedPlan?.tokenAmount;

  const proceedToPayment = useCallback(async () => {
    if (isRequestingRef.current) return;
    if (!purchaseInfo || !selectedPlan || !user) return;
    if (!withdrawalConsent) {
      toast.error("청약철회 제한에 동의해주세요.");
      return;
    }
    if (!paymentWidgetRef.current) {
      toast.error("결제위젯이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    isRequestingRef.current = true;
    setIsPaymentLoading(true);
    try {
      await paymentWidgetRef.current.requestPayment({
        orderId: purchaseInfo.paymentGroupId,
        orderName: `${label} 토큰 ${tokenAmount}개`,
        successUrl: `${window.location.origin}${ROUTES.TOKEN_PURCHASE_SUCCESS}`,
        failUrl: `${window.location.origin}${ROUTES.TOKEN_PURCHASE_FAIL}`,
      });
    } catch (error) {
      const errorCode = hasStringCode(error) ? error.code : "";
      const errorMessage =
        error instanceof Error
          ? error.message
          : "결제 요청 중 오류가 발생했습니다.";
      if (errorCode !== "USER_CANCEL") {
        toast.error(errorMessage);
      }
    } finally {
      setIsPaymentLoading(false);
      isRequestingRef.current = false;
    }
  }, [withdrawalConsent, purchaseInfo, selectedPlan, user, label, tokenAmount]);

  useEffect(() => {
    registerProceedToPayment(proceedToPayment);
    return () => {
      registerProceedToPayment(noopProceedToPayment);
    };
  }, [proceedToPayment, registerProceedToPayment]);

  if (!purchaseInfo || !user) return null;

  if (isPlansLoading || !selectedPlan) {
    return (
      <MainLayout>
        <MainContent className="overflow-visible bg-zinc-50">
          <div className="mx-auto max-w-3xl px-4 py-12">
            {isPlansError ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center">
                <p className="text-sm text-zinc-500">
                  토큰 결제 정보를 다시 불러오지 못했습니다.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchPlans()}
                >
                  다시 시도
                </Button>
              </div>
            ) : (
              <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
            )}
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (price == null || tokenAmount == null) {
    return null;
  }

  return (
    <MainLayout>
      <MainContent className="overflow-visible bg-zinc-50">
        <PageLayout
          contentClassName="space-y-8"
          sidebarClassName="space-y-4 pt-6"
          sidebar={
            <>
              <OrderSummaryAside
                title="결제 금액"
                rows={[
                  { label: "패키지", value: label },
                  { label: "토큰", value: `${tokenAmount.toLocaleString()}개` },
                  {
                    label: "합계",
                    value: (
                      <span className="text-base font-semibold tracking-tight">
                        {price.toLocaleString()}원
                      </span>
                    ),
                    className: "pt-5",
                  },
                ]}
              />

              <PaymentWidgetAside
                title="결제 수단"
                paymentWidgetRef={paymentWidgetRef}
                amount={price}
                customerKey={user.id}
                consent={{
                  id: "withdrawal-consent",
                  checked: withdrawalConsent,
                  onCheckedChange: setWithdrawalConsent,
                  label: "청약철회 제한 동의",
                  description:
                    "토큰은 구매 즉시 사용 가능한 디지털 이용권으로, 이미지 생성에 사용한 후에는 환불되지 않습니다.",
                }}
                className="rounded-2xl"
              />
            </>
          }
          actionBar={
            <PaymentActionBar
              amount={price}
              onClick={onRequestPayment}
              isLoading={isPaymentLoading}
              disabled={!withdrawalConsent}
            />
          }
        >
          <UtilityPageIntro
            eyebrow="Token"
            title="토큰 결제"
            description="선택한 토큰 패키지를 확인하고 결제를 진행합니다."
          />

          <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="bg-zinc-900 px-6 py-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-3">
                    <Check className="size-3.5" />
                    선택됨
                  </span>
                  <p className="text-base font-semibold text-zinc-300">
                    {label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold">
                      {tokenAmount.toLocaleString()}
                    </span>
                    <span className="text-sm text-zinc-400">토큰</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {price.toLocaleString()}원
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {popular && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white">
                      인기
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.TOKEN_PURCHASE)}
                    className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/20"
                  >
                    <ChevronLeft className="size-3" />
                    변경
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white px-6 py-5">
              <ul className="space-y-2.5">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-zinc-700"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-zinc-900" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
};

export default TokenPaymentPage;
