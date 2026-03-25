import { useState } from "react";
import {
  sendPhoneVerification,
  verifyPhone,
} from "@/features/notification/api/notification-api";

type Step = "input" | "verify" | "done";

export const usePhoneVerification = (onVerified: () => Promise<void>) => {
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
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
