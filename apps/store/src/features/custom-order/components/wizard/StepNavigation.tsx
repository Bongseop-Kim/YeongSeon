import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StepNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isQuoteMode: boolean;
  isPending: boolean;
  isSubmitDisabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export const StepNavigation = ({
  isFirstStep,
  isLastStep,
  isQuoteMode,
  isPending,
  isSubmitDisabled,
  onPrev,
  onNext,
  onSubmit,
}: StepNavigationProps) => {
  return (
    <div className="flex justify-between items-center pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={isFirstStep}
        className={isFirstStep ? "invisible" : ""}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        이전
      </Button>

      {isLastStep ? (
        <Button
          type="button"
          onClick={() => { if (!isPending) onSubmit(); }}
          size="lg"
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
        <Button type="button" onClick={onNext}>
          다음
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
};
