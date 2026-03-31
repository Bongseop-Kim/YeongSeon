import { Input } from "@/shared/ui-extended/input";
import { Button } from "@/shared/ui-extended/button";
import { Label } from "@/shared/ui/label";
import { extractPhoneNumber } from "@/shared/lib/phone-format";
import { padZero } from "@/shared/lib/utils";
import { usePhoneVerification } from "@/features/notification/hooks/use-phone-verification";

interface PhoneVerificationFormProps {
  onVerified: () => Promise<void>;
}

export const PhoneVerificationForm = ({
  onVerified,
}: PhoneVerificationFormProps) => {
  const {
    step,
    phone,
    setPhone,
    code,
    setCode,
    isLoading,
    error,
    countdown,
    isCountdownExpired,
    handleSend,
    handleVerify,
    handleResend,
  } = usePhoneVerification(onVerified);

  const handlePhoneChange = (value: string) => {
    setPhone(extractPhoneNumber(value).slice(0, 11));
  };

  if (step === "done") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-green-600">
          전화번호 인증이 완료되었습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "input" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">휴대폰 번호</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="01012345678"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            disabled={isLoading}
            inputMode="numeric"
            autoComplete="tel"
          />
          <Button onClick={handleSend} disabled={isLoading || !phone}>
            {isLoading ? "발송 중..." : "인증번호 받기"}
          </Button>
        </div>
      )}
      {step === "verify" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {phone}으로 인증번호를 발송했습니다.
            </p>
            {countdown > 0 ? (
              <span className="text-sm tabular-nums text-zinc-500">
                {padZero(Math.floor(countdown / 60))}:{padZero(countdown % 60)}
              </span>
            ) : (
              <span className="text-sm text-red-500">만료됨</span>
            )}
          </div>
          <Label htmlFor="code">인증번호</Label>
          <Input
            id="code"
            type="text"
            placeholder="6자리 입력"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(extractPhoneNumber(e.target.value).slice(0, 6))
            }
            disabled={isLoading}
            inputMode="numeric"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={isLoading || !isCountdownExpired}
              className="flex-1"
            >
              재전송
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isLoading || code.length !== 6 || isCountdownExpired}
              className="flex-1"
            >
              {isLoading ? "확인 중..." : "확인"}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
