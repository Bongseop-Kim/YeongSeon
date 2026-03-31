import { useSearchParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/ROUTES";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { Button } from "@/shared/ui-extended/button";
import { AlertTriangle, ReceiptText } from "lucide-react";

const BACK_LABELS: Record<string, string> = {
  [ROUTES.SAMPLE_ORDER]: "샘플 주문으로 돌아가기",
  [ROUTES.CUSTOM_ORDER]: "주문제작으로 돌아가기",
  [ROUTES.ORDER_FORM]: "주문서로 돌아가기",
};

const PaymentFailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get("code");
  const message = searchParams.get("message");
  const returnTo = searchParams.get("returnTo");
  const backRoute =
    returnTo && returnTo in BACK_LABELS ? returnTo : ROUTES.ORDER_FORM;
  const backLabel = BACK_LABELS[backRoute] ?? "이전 페이지로 돌아가기";

  return (
    <MainLayout>
      <MainContent>
        <div className="mx-auto flex min-h-[28rem] max-w-2xl flex-col justify-center px-4 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">
            결제에 실패했습니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            입력한 결제 정보와 한도, 카드사 인증 상태를 다시 확인해주세요.
          </p>
          {message ? (
            <div className="mt-8 rounded-2xl border border-stone-200 px-5 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                메시지
              </p>
              <p className="mt-2 text-sm text-zinc-700">{message}</p>
              {code ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                  <ReceiptText className="h-3.5 w-3.5" />
                  에러 코드: {code}
                </p>
              ) : null}
            </div>
          ) : code ? (
            <p className="mt-6 text-xs text-zinc-400">에러 코드: {code}</p>
          ) : null}
          <div className="mt-8 flex justify-center">
            <Button onClick={() => navigate(backRoute)}>{backLabel}</Button>
          </div>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default PaymentFailPage;
