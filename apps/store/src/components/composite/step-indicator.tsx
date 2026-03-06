import { cn } from "@/lib/utils";

interface BaseStep {
  id: string;
}

interface StepIndicatorProps {
  steps: BaseStep[];
  currentStepIndex: number;
  visitedSteps: ReadonlySet<number>;
  shouldShowStep: (index: number) => boolean;
  onStepClick: (index: number) => void;
  className?: string;
  getAriaLabel?: (params: {
    index: number;
    isCurrent: boolean;
    isCompleted: boolean;
  }) => string;
}

const defaultAriaLabel = ({
  index,
  isCurrent,
  isCompleted,
}: {
  index: number;
  isCurrent: boolean;
  isCompleted: boolean;
}) => `${index + 1}단계${isCurrent ? ", 현재 단계" : isCompleted ? ", 완료" : ""}`;

export function StepIndicator({
  steps,
  currentStepIndex,
  visitedSteps,
  shouldShowStep,
  onStepClick,
  className,
  getAriaLabel = defaultAriaLabel,
}: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {steps.map((step, index) => {
        const isVisible = shouldShowStep(index);
        const isVisited = visitedSteps.has(index);
        const isCurrent = index === currentStepIndex;
        const isCompleted = isVisited && !isCurrent;
        const isClickable = isVisible && isVisited && !isCurrent;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            aria-label={getAriaLabel({ index, isCurrent, isCompleted })}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "h-1.5 w-7 rounded-full transition-colors",
              isCurrent || isCompleted ? "bg-zinc-900" : "bg-zinc-200",
              !isVisible && "bg-zinc-200/50",
              isClickable && "cursor-pointer hover:bg-zinc-700",
              !isClickable && "cursor-default"
            )}
          />
        );
      })}
    </div>
  );
}
