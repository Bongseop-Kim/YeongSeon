import { useSearchParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui-extended/button";

const TokenPurchaseFailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <MainLayout>
      <MainContent>
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <p className="text-red-500 text-lg font-semibold">
            결제에 실패했습니다
          </p>
          {message && <p className="text-zinc-600 text-sm">{message}</p>}
          {code && <p className="text-zinc-400 text-xs">에러 코드: {code}</p>}
          <Button onClick={() => navigate(ROUTES.TOKEN_PURCHASE)}>
            토큰 구매로 돌아가기
          </Button>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default TokenPurchaseFailPage;
