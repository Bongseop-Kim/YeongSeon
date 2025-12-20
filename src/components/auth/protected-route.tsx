import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/features/auth/api/auth.query";
import { useAuthStore } from "@/store/auth";
import { ROUTES } from "@/constants/ROUTES";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 * 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트하며,
 * 로그인 후 원래 가려던 페이지로 돌아갈 수 있도록 현재 경로를 전달합니다.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { data: session, isLoading } = useSession();
  const { initialized } = useAuthStore();

  // 인증 상태 초기화 대기
  if (!initialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  // 현재 경로를 state와 sessionStorage에 저장하여 로그인 후 돌아올 수 있도록 함
  // session이 있으면 user도 존재하므로 session만 확인
  if (!session) {
    const redirectPath = location.pathname + location.search;
    // OAuth 콜백 후에도 경로를 복원할 수 있도록 sessionStorage에 저장
    sessionStorage.setItem("authRedirect", redirectPath);
    return (
      <Navigate to={ROUTES.LOGIN} state={{ from: redirectPath }} replace />
    );
  }

  return <>{children}</>;
}
