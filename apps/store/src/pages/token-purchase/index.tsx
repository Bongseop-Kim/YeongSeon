import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { ROUTES } from "@/shared/constants/ROUTES";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { PlanCard } from "@/features/token-purchase";
import {
  useCreateTokenPurchaseMutation,
  useTokenPlansQuery,
} from "@/entities/token-purchase";
import { useAuthStore } from "@/shared/store/auth";
import { toast } from "@/shared/lib/toast";
import { Button } from "@/shared/ui-extended/button";
import type { TokenPlan, TokenPlanKey } from "@/entities/token-purchase";

const TokenPurchasePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const pendingRequestIdRef = useRef<number>(0);
  const [selectedPlan, setSelectedPlan] = useState<TokenPlanKey | null>(null);

  const {
    data: tokenPlans,
    isLoading: isPlansLoading,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useTokenPlansQuery();
  const { mutateAsync: createTokenPurchase, isPending } =
    useCreateTokenPurchaseMutation();

  const validTokenPlans = (tokenPlans ?? []).filter(
    (plan): plan is TokenPlan & { price: number; tokenAmount: number } =>
      plan.price != null && plan.tokenAmount != null,
  );

  const handlePlanSelect = async (planKey: TokenPlanKey) => {
    if (isPending) return;
    if (!user) {
      toast.error("로그인 후 이용할 수 있어요.");
      navigate(ROUTES.LOGIN);
      return;
    }

    const currentRequestId = ++pendingRequestIdRef.current;
    setSelectedPlan(planKey);

    try {
      const purchaseInfo = await createTokenPurchase(planKey);
      if (pendingRequestIdRef.current !== currentRequestId) return;

      const planData = validTokenPlans.find((p) => p.planKey === planKey);
      navigate(ROUTES.TOKEN_PURCHASE_PAYMENT, {
        state: {
          purchaseInfo,
          planKey,
          label: planData?.label ?? planKey,
          features: planData?.features ?? [],
          popular: planData?.popular ?? false,
        },
      });
    } catch (err) {
      if (pendingRequestIdRef.current === currentRequestId) {
        const message =
          err instanceof Error
            ? err.message
            : "토큰 플랜을 선택하지 못했어요. 잠시 후 다시 시도해주세요.";
        toast.error(message);
        setSelectedPlan(null);
      }
    }
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout breadcrumbs={PAGE_BREADCRUMBS.TOKEN_PURCHASE}>
          <div className="mx-auto max-w-5xl py-12">
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-accent">
                Token
              </p>
              <h1 className="mt-3 text-3xl font-bold text-foreground">
                토큰 충전
              </h1>
              <p className="mt-3 text-sm text-foreground-muted">
                이미지 생성과 텍스트 제작에 사용할 토큰을 플랜 단위로
                충전합니다.
              </p>
            </div>

            <div className="token-purchase-panel mb-10 border border-border/70 bg-surface px-6 py-5">
              <p className="mb-3 text-sm font-semibold text-foreground">
                토큰 사용 안내
              </p>
              <div className="space-y-2 text-sm text-foreground-subtle">
                <p>
                  현재 디자인 생성 서비스는 베타 모드로 운영 중이며, 기능 개선에
                  따라 토큰 사용량과 차감 기준이 변동될 수 있습니다.
                </p>
                <p>
                  디자인 생성 과정에는 텍스트 생성, 패턴 보정, 이미지 생성 등의
                  단계가 포함될 수 있으며, 단계별 실제 사용량은 생성 방식과 모델
                  설정에 따라 달라질 수 있습니다.
                </p>
              </div>
              <p className="mt-3 text-xs text-foreground-muted">
                구매 토큰은 결제 시점으로부터{" "}
                <span className="font-semibold text-foreground">1년 이내</span>{" "}
                사용할 수 있습니다. 사용량 정책이 확정되면 안내 문구에 최신
                기준을 반영하겠습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {isPlansLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="token-purchase-panel h-80 animate-pulse bg-surface-muted"
                  />
                ))
              ) : isPlansError ? (
                <div className="col-span-full flex flex-col items-center gap-3 py-12 text-foreground-muted">
                  <p className="text-sm">
                    토큰 플랜을 불러오는데 실패했습니다.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchPlans()}
                  >
                    다시 시도
                  </Button>
                </div>
              ) : validTokenPlans.length === 0 ? (
                <div className="col-span-full py-12 text-center text-sm text-foreground-muted">
                  현재 이용 가능한 플랜이 없습니다.
                </div>
              ) : (
                validTokenPlans.map((plan) => (
                  <PlanCard
                    key={plan.planKey}
                    {...plan}
                    selected={selectedPlan === plan.planKey}
                    isPending={isPending && selectedPlan === plan.planKey}
                    onSelect={handlePlanSelect}
                  />
                ))
              )}
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
};

export default TokenPurchasePage;
