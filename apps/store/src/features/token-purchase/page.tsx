import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PlanCard } from "@/features/token-purchase/components/plan-card";
import {
  useCreateTokenPurchaseMutation,
  useTokenPlansQuery,
} from "@/features/token-purchase/api/token-purchase-query";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import type {
  TokenPlan,
  TokenPlanKey,
} from "@/features/token-purchase/api/token-purchase-api";

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
      toast.error("로그인이 필요합니다.");
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
            : "플랜 선택 중 오류가 발생했습니다.";
        toast.error(message);
        setSelectedPlan(null);
      }
    }
  };

  return (
    <MainLayout>
      <MainContent>
        <div className="mx-auto max-w-5xl py-12 px-4">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-zinc-900">토큰 충전</h1>
          </div>

          <div className="mb-10 rounded-2xl border border-zinc-100 bg-zinc-50 px-6 py-5">
            <p className="mb-3 text-sm font-semibold text-zinc-700">
              토큰 사용 안내
            </p>
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              <div className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-zinc-400">
                  1
                </span>
                <span>
                  OpenAI 텍스트 생성 —{" "}
                  <span className="font-semibold text-zinc-800">1 token</span>
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-zinc-400">
                  2
                </span>
                <span>
                  Gemini 텍스트 생성 —{" "}
                  <span className="font-semibold text-zinc-800">1 token</span>
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-zinc-400">
                  3
                </span>
                <span>
                  OpenAI 이미지 생성 —{" "}
                  <span className="font-semibold text-zinc-800">5 tokens</span>
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-zinc-400">
                  4
                </span>
                <span>
                  Gemini 이미지 생성 —{" "}
                  <span className="font-semibold text-zinc-800">3 tokens</span>
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              이미지 생성 실패 시 채팅 토큰(1 token)만 차감됩니다. 구매 토큰은
              만료 없이 사용할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {isPlansLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-2xl bg-zinc-100"
                />
              ))
            ) : isPlansError ? (
              <div className="col-span-full flex flex-col items-center gap-3 py-12 text-zinc-500">
                <p className="text-sm">토큰 플랜을 불러오는데 실패했습니다.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchPlans()}
                >
                  다시 시도
                </Button>
              </div>
            ) : validTokenPlans.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-zinc-400">
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
      </MainContent>
    </MainLayout>
  );
};

export default TokenPurchasePage;
