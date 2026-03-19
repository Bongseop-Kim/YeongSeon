import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PwInput } from "@/components/composite/pw-input";
import { useEmailSignIn, useSignIn } from "@/features/auth/api/auth-query";
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

const emailLoginSchema = z.object({
  email: z.string().trim().email("올바른 이메일 주소를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

type EmailLoginFormValues = z.infer<typeof emailLoginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const signInMutation = useSignIn();
  const emailSignInMutation = useEmailSignIn();
  const { openPopup } = usePopup();
  const from =
    (isLocationStateWithFrom(location.state)
      ? location.state?.from
      : undefined) ||
    sessionStorage.getItem("authRedirect") ||
    ROUTES.HOME;
  const form = useForm<EmailLoginFormValues>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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

  const isSubmitting =
    signInMutation.isPending || emailSignInMutation.isPending;

  return (
    <MainLayout>
      <MainContent>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">로그인</h1>
              <p className="text-sm text-zinc-600">
                이메일 또는 소셜 계정으로 로그인하세요
              </p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  emailSignInMutation.mutate(values),
                )}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="login-email">이메일</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="이메일을 입력해주세요."
                    disabled={isSubmitting}
                    aria-invalid={!!form.formState.errors.email}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">비밀번호</Label>
                  <PwInput
                    id="login-password"
                    autoComplete="current-password"
                    placeholder="비밀번호를 입력해주세요."
                    disabled={isSubmitting}
                    aria-invalid={!!form.formState.errors.password}
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "로그인 중..." : "이메일로 로그인"}
                </Button>
              </form>
            </Form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-zinc-500">또는</span>
              </div>
            </div>
            <div className="space-y-3">
              {PROVIDERS.map((provider) => (
                <ProviderButton
                  key={provider.id}
                  provider={provider}
                  onSignIn={handleSignIn}
                  isPending={isSubmitting}
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
