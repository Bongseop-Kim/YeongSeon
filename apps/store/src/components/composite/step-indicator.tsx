import { cn } from "@/lib/utils";

interface BaseStep {
  id: string;
}

interface StepIndicatorProps {
  steps: BaseStep[];
  currentStepIndex: number;
  visitedSteps: ReadonlySet<number>;
  completedSteps?: ReadonlySet<number>;
  shouldShowStep: (index: number) => boolean;
  isHiddenStep?: (index: number) => boolean;
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
  completedSteps,
  shouldShowStep,
  isHiddenStep,
  onStepClick,
  className,
  getAriaLabel = defaultAriaLabel,
}: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {steps.map((step, index) => {
        const isVisible = shouldShowStep(index);
        const isHidden = isHiddenStep?.(index) ?? false;
        const isVisited = visitedSteps.has(index);
        const isCurrent = index === currentStepIndex;
        const isCompleted = completedSteps
          ? completedSteps.has(index)
          : isVisited && !isCurrent;
        const isClickable = !isHidden && isVisited && !isCurrent;

        if (isHidden) {
          return (
            <span
              key={step.id}
              aria-hidden="true"
              role="presentation"
              className="h-1.5 w-7 rounded-full bg-zinc-200/50"
            />
          );
        }

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
              isCurrent || isCompleted
                ? "bg-zinc-900"
                : isVisible
                  ? "bg-zinc-200"
                  : "bg-zinc-200/70",
              isClickable && "cursor-pointer hover:bg-zinc-700",
              !isClickable && "cursor-default"
            )}
          />
        );
      })}
    </div>
  );
}
