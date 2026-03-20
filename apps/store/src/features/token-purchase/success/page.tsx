import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { useConfirmTokenPurchase } from "@/features/token-purchase/api/token-purchase-query";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

const TokenPurchaseSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutate: confirmTokenPurchase } = useConfirmTokenPurchase();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    if (!paymentKey || !orderId || !amount) {
      setError("결제 정보가 올바르지 않습니다.");
      return;
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount)) {
      setError("결제 금액이 올바르지 않습니다.");
      return;
    }

    confirmTokenPurchase(
      { paymentKey, orderId, amount: parsedAmount },
      {
        onSuccess: (result) => {
          if (result.type !== "token_purchase") {
            setError("올바르지 않은 결제 응답입니다.");
            return;
          }

          toast.success(
            `토큰 ${result.tokenAmount.toLocaleString()}개가 충전되었습니다!`,
          );
          navigate(ROUTES.DESIGN, { replace: true });
        },
        onError: (err) => {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "결제 처리 중 오류가 발생했습니다.";
          setError(errorMessage);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: 토큰 충전 처리는 마운트 시 1회만 실행, deps 추가 시 중복 처리 발생
  }, []);

  if (error) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={() => navigate(ROUTES.TOKEN_PURCHASE)}
              className="text-blue-600 underline"
            >
              토큰 구매로 돌아가기
            </button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-lg text-zinc-600">결제를 확인하고 있습니다...</p>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default TokenPurchaseSuccessPage;
