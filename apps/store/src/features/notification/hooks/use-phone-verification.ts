import { useEffect, useRef, useState } from "react";
import { sendPhoneVerification, verifyPhone } from "@/entities/notification";

type Step = "input" | "verify" | "done";
const VERIFICATION_EXPIRES_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 60;

const isValidKoreanPhone = (value: string): boolean =>
  /^01[0-9]{8,9}$/.test(value);

export const usePhoneVerification = (onVerified: () => Promise<void>) => {
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current === null) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startCountdown = () => {
    clearTimer();
    setCountdown(VERIFICATION_EXPIRES_SECONDS);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }

        return prev - 1;
      });
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  };

  useEffect(() => clearTimer, []);

  const handleSend = async () => {
    setError(null);
    if (!isValidKoreanPhone(phone)) {
      setError("유효한 휴대폰 번호를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      await sendPhoneVerification(phone);
      setStep("verify");
      startCountdown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    if (!isValidKoreanPhone(phone)) {
      setError("유효한 휴대폰 번호를 입력해주세요.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("6자리 인증번호를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      await verifyPhone(phone, code);
      await onVerified();
      clearTimer();
      setCountdown(0);
      setResendCooldown(0);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const isCountdownExpired = countdown === 0 && step === "verify";
  const canResend = step === "verify" && resendCooldown === 0 && !isLoading;

  const handleResend = async () => {
    if (!canResend) {
      return;
    }

    setCode("");
    setError(null);
    await handleSend();
  };

  return {
    step,
    phone,
    setPhone,
    code,
    setCode,
    isLoading,
    error,
    countdown,
    resendCooldown,
    isCountdownExpired,
    canResend,
    handleSend,
    handleVerify,
    handleResend,
  };
};
