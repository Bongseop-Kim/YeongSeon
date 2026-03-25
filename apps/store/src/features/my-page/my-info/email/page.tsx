import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui-extended/button";
import { Input } from "@/components/ui-extended/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/ROUTES";
import {
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import {
  EMAIL_CODE_LENGTH,
  useEmailChange,
} from "@/features/my-page/my-info/email/hooks/use-email-change";

export default function MyInfoEmailPage() {
  const navigate = useNavigate();
  const {
    profile,
    form,
    step,
    requestedEmail,
    cooldownSecondsLeft,
    errorMessage,
    isSubmitting,
    canRequestCode,
    canVerifyCode,
    canResendCode,
    requestCodeMutation,
    resendCodeMutation,
    verifyCodeMutation,
    handleRequestCode,
    handleResendCode,
    handleVerifyCode,
    handleBackToRequest,
  } = useEmailChange();

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Email Update"
              title="이메일 변경"
              description="새 이메일 주소로 인증을 진행한 뒤 로그인 이메일을 변경합니다."
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0 space-y-8 px-4 lg:px-0">
                <UtilityPageSection
                  title="인증 진행"
                  description="새 이메일을 입력하고 인증번호를 받아 검증을 완료해 주세요."
                >
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none text-zinc-950">
                        현재 이메일
                      </p>
                      <p className="text-sm text-zinc-500">
                        {profile?.email || "-"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="mb-1" htmlFor="email-input">
                        새 이메일
                      </Label>
                      <Controller
                        name="email"
                        control={form.control}
                        render={({ field }) => (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              id="email-input"
                              type="email"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-full"
                              disabled={step !== "request"}
                            />
                            <Button
                              onClick={handleRequestCode}
                              variant="outline"
                              className="sm:w-28"
                              disabled={!canRequestCode || step !== "request"}
                            >
                              {requestCodeMutation.isPending
                                ? "요청 중"
                                : "인증요청"}
                            </Button>
                          </div>
                        )}
                      />
                    </div>

                    {step === "verify" && (
                      <>
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                          <p className="text-sm text-zinc-700">
                            {requestedEmail}로 인증번호를 보냈습니다.
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {cooldownSecondsLeft > 0
                              ? `${cooldownSecondsLeft}초 후 재요청 가능`
                              : "코드가 오지 않았다면 재요청할 수 있습니다."}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="mb-1" htmlFor="email-code-input">
                            인증번호
                          </Label>
                          <Controller
                            name="emailCode"
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                id="email-code-input"
                                type="text"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-full"
                                maxLength={EMAIL_CODE_LENGTH}
                              />
                            )}
                          />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleBackToRequest}
                            disabled={isSubmitting}
                          >
                            이메일 수정
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={handleVerifyCode}
                            disabled={!canVerifyCode}
                          >
                            {verifyCodeMutation.isPending
                              ? "검증 중"
                              : "코드 검증"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleResendCode}
                            disabled={!canResendCode}
                          >
                            {resendCodeMutation.isPending
                              ? "재요청 중"
                              : "인증번호 재요청"}
                          </Button>
                        </div>
                      </>
                    )}

                    {step === "complete" && (
                      <div className="space-y-3">
                        <p className="text-sm text-zinc-700">
                          이메일이 변경되었습니다.
                        </p>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO)}
                        >
                          완료
                        </Button>
                      </div>
                    )}

                    {errorMessage && (
                      <p className="text-sm text-red-600" role="alert">
                        {errorMessage}
                      </p>
                    )}
                  </div>
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 px-4 lg:sticky lg:top-24 lg:self-start lg:px-0">
                <UtilityPageAside
                  title="안내"
                  description="이메일이 바뀌면 이후 로그인과 안내 메일 수신 주소도 함께 변경됩니다."
                  tone="muted"
                >
                  <ul className="space-y-2 text-sm leading-6 text-zinc-600">
                    <li>현재 사용 가능한 이메일 주소만 입력해 주세요.</li>
                    <li>인증이 완료되기 전까지 기존 이메일은 유지됩니다.</li>
                    <li>
                      완료 후 내 정보 화면으로 돌아가 변경 내용을 확인할 수
                      있습니다.
                    </li>
                  </ul>
                </UtilityPageAside>
              </div>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
