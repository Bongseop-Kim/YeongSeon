import { useState } from "react";
import { sendPhoneVerification, verifyPhone } from "@/entities/notification";

type Step = "input" | "verify" | "done";

const isValidKoreanPhone = (value: string): boolean =>
  /^01[0-9]{8,9}$/.test(value);

export const usePhoneVerification = (onVerified: () => Promise<void>) => {
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
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
    handleSend,
    handleVerify,
    handleResend,
  };
};
