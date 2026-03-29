import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/entities/auth";
import { useAuthStore } from "@/shared/store/auth";
import { ROUTES } from "@/shared/constants/ROUTES";
import { isCustomPaymentState } from "@/shared/lib/custom-payment-state";
import {
  removeCustomPaymentState,
  saveCustomPaymentState,
} from "@/shared/lib/custom-payment-storage";
import { AUTH_REDIRECT_STORAGE_KEY } from "@/shared/lib/auth-redirect";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { data: session, isLoading } = useSession();
  const { initialized } = useAuthStore();

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

  if (!session) {
    const redirectPath = location.pathname + location.search;
    if (
      (location.pathname === ROUTES.CUSTOM_PAYMENT ||
        location.pathname === ROUTES.SAMPLE_PAYMENT) &&
      isCustomPaymentState(location.state)
    ) {
      saveCustomPaymentState(location.state);
    } else {
      removeCustomPaymentState();
    }
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, redirectPath);
    return (
      <Navigate to={ROUTES.LOGIN} state={{ from: redirectPath }} replace />
    );
  }

  return <>{children}</>;
}
