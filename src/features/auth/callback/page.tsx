import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/features/auth/api/auth.query";
import { ROUTES } from "@/constants/ROUTES";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { data: session, isLoading, isError } = useSession();

  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) return;

    // 에러 발생 시 로그인 페이지로
    if (isError) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // 세션이 있으면 원래 가려던 페이지 또는 홈으로 리다이렉트
    if (session) {
      // ProtectedRoute에서 저장한 원래 경로 확인
      const redirectPath = sessionStorage.getItem("authRedirect");
      if (redirectPath) {
        sessionStorage.removeItem("authRedirect");
        navigate(redirectPath, { replace: true });
      } else {
        navigate(ROUTES.HOME, { replace: true });
      }
    } else {
      navigate(ROUTES.LOGIN);
    }
  }, [session, isLoading, isError, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
            <p className="text-lg text-zinc-600">로그인 처리 중...</p>
          </>
        ) : isError ? (
          <p className="text-lg text-red-600">
            로그인 처리 중 오류가 발생했습니다.
          </p>
        ) : (
          <p className="text-lg text-zinc-600">리다이렉트 중...</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
