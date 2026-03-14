import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";

interface StepNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isQuoteMode: boolean;
  isPending: boolean;
  isSubmitDisabled: boolean;
  hintText: string;
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
  hintText,
  onPrev,
  onNext,
  onSubmit,
}: StepNavigationProps) => {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardDescription aria-live="polite" aria-atomic="true">
          {hintText}
        </CardDescription>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button type="button" variant="outline" onClick={onPrev}>
              <ChevronLeft />
              이전
            </Button>
          )}

          {isLastStep ? (
            <Button
              type="button"
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
            <Button type="button" onClick={onNext}>
              다음
              <ChevronRight />
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
};
