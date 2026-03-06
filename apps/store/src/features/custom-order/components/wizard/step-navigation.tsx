import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
        <CardDescription>
          {hintText}
        </CardDescription>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={isFirstStep}
            className={cn(
              isFirstStep && "invisible"
            )}
          >
            <ChevronLeft />
            이전
          </Button>

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
            <Button
              type="button"
              onClick={onNext}
            >
              다음
              <ChevronRight />
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
};
