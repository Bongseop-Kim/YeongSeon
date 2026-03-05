import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { useEmailChange, EMAIL_CODE_LENGTH } from "@/features/my-page/my-info/email/hooks/use-email-change";

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
        <PageLayout>
          <Card className="max-w-xl">
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">현재 이메일</p>
                <p className="text-sm text-zinc-500">{profile?.email || "-"}</p>
              </div>

              <Label className="mb-1" htmlFor="email-input">
                이메일
              </Label>
              <Controller
                name="email"
                control={form.control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
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
                      className="w-24"
                      disabled={!canRequestCode || step !== "request"}
                    >
                      {requestCodeMutation.isPending ? "요청 중" : "인증요청"}
                    </Button>
                  </div>
                )}
              />

              {step !== "request" && (
                <>
                  <div className="space-y-2 rounded-md bg-zinc-50 p-3">
                    <p className="text-sm text-zinc-700">
                      {requestedEmail}로 인증번호를 보냈습니다.
                    </p>
                    {step === "verify" && (
                      <p className="text-xs text-zinc-500">
                        코드가 오지 않았나요?{" "}
                        {cooldownSecondsLeft > 0
                          ? `${cooldownSecondsLeft}초 후 재요청 가능`
                          : "재요청할 수 있습니다."}
                      </p>
                    )}
                  </div>

                  {step === "verify" && (
                    <>
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

                      <div className="flex gap-2">
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
                          {verifyCodeMutation.isPending ? "검증 중" : "코드 검증"}
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
                    <>
                      <p className="text-sm text-zinc-700">
                        이메일이 변경되었습니다.
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO)}
                      >
                        완료
                      </Button>
                    </>
                  )}
                </>
              )}

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
            </CardContent>
          </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
