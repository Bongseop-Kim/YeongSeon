import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreakpoint } from "@/providers/breakpoint-provider";

interface WizardActionButtonsProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isSubmitDisabled: boolean;
  isQuoteMode: boolean;
  grandTotal: number;
  estimatedDays: string;
  isLoggedIn: boolean;
  hasAddress: boolean;
}

export function WizardActionButtons({
  isFirstStep,
  isLastStep,
  onPrev,
  onNext,
  onSubmit,
  isPending,
  isSubmitDisabled,
  isQuoteMode,
  grandTotal,
  estimatedDays,
  isLoggedIn,
  hasAddress,
}: WizardActionButtonsProps) {
  const { isMobile } = useBreakpoint();

  const submitLabel = isPending
    ? isQuoteMode
      ? "견적요청 처리 중..."
      : "주문 처리 중..."
    : isQuoteMode
      ? "견적요청"
      : `${grandTotal.toLocaleString()}원 주문하기`;

  if (isMobile) {
    if (isLastStep) {
      return (
        <div className="space-y-2">
          <Button
            type="button"
            onClick={onSubmit}
            size="xl"
            className="w-full"
            disabled={isSubmitDisabled}
          >
            {submitLabel}
          </Button>
          {!isLoggedIn ? (
            <p className="text-sm text-center text-zinc-500">
              로그인 후 {isQuoteMode ? "견적요청" : "주문"}을 진행할 수 있어요
            </p>
          ) : !hasAddress ? (
            <p className="text-sm text-center text-zinc-500">
              배송지를 추가하면 {isQuoteMode ? "견적요청" : "주문"}을 진행할 수
              있어요
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm mb-2">
          {isLoggedIn ? (
            <span className="text-zinc-900 font-medium">
              {grandTotal.toLocaleString()}원
            </span>
          ) : (
            <span className="text-zinc-500 text-xs">
              예상 기간: {estimatedDays}
            </span>
          )}
          {isLoggedIn && <span className="text-zinc-500">{estimatedDays}</span>}
        </div>
        <div className="flex gap-2 items-center">
          {!isFirstStep && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPrev}
              className="size-12 shrink-0"
            >
              <ChevronLeft />
            </Button>
          )}
          <Button type="button" size="xl" onClick={onNext} className="flex-1">
            다음
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isFirstStep && (
        <Button type="button" variant="outline" size="xl" onClick={onPrev}>
          <ChevronLeft />
          이전
        </Button>
      )}
      {isLastStep ? (
        <Button
          type="button"
          size="xl"
          className="flex-1"
          onClick={() => {
            if (!isPending) onSubmit();
          }}
          disabled={isSubmitDisabled || isPending}
        >
          {isPending
            ? isQuoteMode
              ? "견적요청 처리 중..."
              : "주문 처리 중..."
            : isQuoteMode
              ? "견적요청"
              : "주문하기"}
        </Button>
      ) : (
        <Button type="button" size="xl" className="flex-1" onClick={onNext}>
          다음
          <ChevronRight />
        </Button>
      )}
    </div>
  );
}
