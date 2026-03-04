import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useProfile } from "@/features/my-page/api/profile-query";
import {
  useRequestEmailChangeCode,
  useResendEmailChangeCode,
  useVerifyEmailChangeCode,
} from "@/features/my-page/api/email-query";
import { toast } from "@/lib/toast";

export const EMAIL_CODE_LENGTH = 6;
export const RESEND_COOLDOWN_SECONDS = 60;

export type EmailChangeStep = "request" | "verify" | "complete";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function useEmailChange() {
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

  return {
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
  };
}
