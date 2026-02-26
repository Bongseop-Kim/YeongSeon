import { useEffect, useMemo, useState } from "react";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller, useForm } from "react-hook-form";
import { useProfile } from "@/features/my-page/api/profile-query";
import {
  useRequestEmailChangeCode,
  useResendEmailChangeCode,
  useVerifyEmailChangeCode,
} from "@/features/my-page/api/email-query";
import { toast } from "@/lib/toast";

const EMAIL_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type EmailChangeStep = "request" | "verify" | "complete";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function MyInfoEmailPage() {
  const { data: profile } = useProfile();
  const requestCodeMutation = useRequestEmailChangeCode();
  const resendCodeMutation = useResendEmailChangeCode();
  const verifyCodeMutation = useVerifyEmailChangeCode();

  const form = useForm<{ email: string; emailCode: string }>({
    defaultValues: {
      email: "",
      emailCode: "",
    },
  });
  const [step, setStep] = useState<EmailChangeStep>("request");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [cooldownEndAt, setCooldownEndAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const nextEmail = form.watch("email");
  const emailCode = form.watch("emailCode");
  const isSubmitting =
    requestCodeMutation.isPending ||
    resendCodeMutation.isPending ||
    verifyCodeMutation.isPending;

  const cooldownSecondsLeft = useMemo(() => {
    if (!cooldownEndAt) {
      return 0;
    }
    const diff = Math.ceil((cooldownEndAt - now) / 1000);
    return diff > 0 ? diff : 0;
  }, [cooldownEndAt, now]);

  useEffect(() => {
    if (step !== "verify" || !cooldownEndAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldownEndAt, step]);

  const canRequestCode = isValidEmail(nextEmail) && !isSubmitting;
  const canVerifyCode =
    step === "verify" &&
    requestedEmail.length > 0 &&
    emailCode.trim().length === EMAIL_CODE_LENGTH &&
    !verifyCodeMutation.isPending;
  const canResendCode =
    step === "verify" &&
    requestedEmail.length > 0 &&
    cooldownSecondsLeft === 0 &&
    !resendCodeMutation.isPending;

  const handleRequestCode = form.handleSubmit(async ({ email }) => {
    setErrorMessage("");
    try {
      await requestCodeMutation.mutateAsync(email.trim());
      setRequestedEmail(email.trim());
      setCooldownEndAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setStep("verify");
      form.setValue("emailCode", "");
      toast.success("인증번호를 전송했습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "인증요청에 실패했습니다. 다시 시도해주세요.";
      setErrorMessage(message);
      toast.error(message);
    }
  });

  const handleResendCode = async () => {
    if (!canResendCode) {
      return;
    }

    setErrorMessage("");
    try {
      await resendCodeMutation.mutateAsync(requestedEmail);
      setCooldownEndAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      toast.success("인증번호를 다시 전송했습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "인증번호 재요청에 실패했습니다.";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const handleVerifyCode = form.handleSubmit(async ({ emailCode: code }) => {
    if (step !== "verify") {
      return;
    }

    setErrorMessage("");
    try {
      await verifyCodeMutation.mutateAsync({
        email: requestedEmail,
        code: code.trim(),
      });
      setStep("complete");
      toast.success("이메일이 변경되었습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "인증번호 확인에 실패했습니다.";
      setErrorMessage(message);
      toast.error(message);
    }
  });

  const handleBackToRequest = () => {
    setStep("request");
    setRequestedEmail("");
    setCooldownEndAt(null);
    setErrorMessage("");
    form.setValue("emailCode", "");
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
            <Card className="max-w-xl">
              <CardHeader />
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="mb-1">현재 이메일</Label>
                  <p className="text-sm text-zinc-500">{profile?.email || "-"}</p>
                </div>

                <Label className="mb-1">이메일</Label>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Input
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
                        <Label className="mb-1">인증번호</Label>
                        <Controller
                          name="emailCode"
                          control={form.control}
                          render={({ field }) => (
                            <Input
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
                      <Button className="w-full" disabled>
                        완료
                      </Button>
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
