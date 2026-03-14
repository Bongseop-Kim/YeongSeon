import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { useSignIn } from "@/features/auth/api/auth-query";
import { ProviderButton } from "@/features/auth/components/provider-button";
import {
  PROVIDERS,
  type SupportedProvider,
} from "@/features/auth/constants/providers";
import { ROUTES } from "@/constants/ROUTES";
import { usePopup } from "@/hooks/usePopup";
import { useAuthStore } from "@/store/auth";

const isLocationStateWithFrom = (
  value: unknown,
): value is { from?: string } => {
  if (typeof value !== "object" || value === null) return false;
  if (!Object.prototype.hasOwnProperty.call(value, "from")) return true;
  const from = Reflect.get(value, "from");
  return typeof from === "string" || typeof from === "undefined";
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const signInMutation = useSignIn();
  const { openPopup } = usePopup();
  const from =
    (isLocationStateWithFrom(location.state)
      ? location.state?.from
      : undefined) ||
    sessionStorage.getItem("authRedirect") ||
    ROUTES.HOME;

  useEffect(() => {
    if (!user) return;
    const redirectPath = sessionStorage.getItem("authRedirect");
    if (redirectPath) {
      sessionStorage.removeItem("authRedirect");
      navigate(redirectPath, { replace: true });
      return;
    }
    navigate(from, { replace: true });
  }, [from, navigate, user]);

  const handleSignIn = async (provider: SupportedProvider) => {
    await signInMutation.mutateAsync(provider);
  };

  return (
    <MainLayout>
      <MainContent>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">로그인</h1>
              <p className="text-sm text-zinc-600">
                소셜 계정으로 간편하게 로그인하세요
              </p>
            </div>
            <div className="space-y-3">
              {PROVIDERS.map((provider) => (
                <ProviderButton
                  key={provider.id}
                  provider={provider}
                  onSignIn={handleSignIn}
                  isPending={signInMutation.isPending}
                />
              ))}
            </div>
            <div className="text-center text-xs text-zinc-500 pt-4">
              <p>
                로그인 시{" "}
                <a
                  href={ROUTES.TERMS_OF_SERVICE}
                  className="underline"
                  onClick={(e) => {
                    e.preventDefault();
                    openPopup(ROUTES.TERMS_OF_SERVICE);
                  }}
                >
                  이용약관
                </a>
                과{" "}
                <a
                  href={ROUTES.PRIVACY_POLICY}
                  className="underline"
                  onClick={(e) => {
                    e.preventDefault();
                    openPopup(ROUTES.PRIVACY_POLICY);
                  }}
                >
                  개인정보처리방침
                </a>
                에 동의하게 됩니다.
              </p>
            </div>
          </div>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default LoginPage;
