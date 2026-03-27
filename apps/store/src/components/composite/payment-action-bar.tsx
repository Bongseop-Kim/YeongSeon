import { type ReactNode } from "react";
import { Button } from "@/components/ui-extended/button";

interface PaymentActionBarProps {
  amount: number | null;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isPriceReady?: boolean;
  isPriceError?: boolean;
  helperText?: ReactNode;
  "data-testid"?: string;
}

function getButtonLabel({
  amount,
  isLoading,
  isPriceReady,
  isPriceError,
}: Pick<
  PaymentActionBarProps,
  "amount" | "isLoading" | "isPriceReady" | "isPriceError"
>) {
  if (isLoading) return "결제 요청 중...";
  if (isPriceError) return "가격 정보를 확인할 수 없습니다";
  if (!isPriceReady || amount === null) return "가격 로딩 중...";
  return `${amount.toLocaleString()}원 결제하기`;
}

export function PaymentActionBar({
  amount,
  onClick,
  disabled,
  isLoading,
  isPriceReady = true,
  isPriceError = false,
  helperText,
  "data-testid": testId,
}: PaymentActionBarProps) {
  const label = getButtonLabel({
    amount,
    isLoading,
    isPriceReady,
    isPriceError,
  });
  const isDisabled =
    disabled || isLoading || isPriceError || !isPriceReady || amount === null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        size="xl"
        onClick={onClick}
        disabled={isDisabled}
        data-testid={testId}
      >
        {label}
      </Button>
      {helperText}
    </div>
  );
}
