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
    displayIndex: number;
    isCurrent: boolean;
    isCompleted: boolean;
  }) => string;
}

const defaultAriaLabel = ({
  displayIndex,
  isCurrent,
  isCompleted,
}: {
  displayIndex: number;
  isCurrent: boolean;
  isCompleted: boolean;
}) =>
  `${displayIndex}단계${isCurrent ? ", 현재 단계" : isCompleted ? ", 완료" : ""}`;

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
  const visibleSteps = steps
    .map((step, index) => ({ step, index }))
    .filter(({ index }) => {
      if (!shouldShowStep(index)) return false;
      return !(isHiddenStep?.(index) ?? false);
    });

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {visibleSteps.map(({ step, index }, visibleIndex) => {
        const isVisited = visitedSteps.has(index);
        const isCurrent = index === currentStepIndex;
        const isCompleted = completedSteps
          ? completedSteps.has(index)
          : isVisited && !isCurrent;
        const isClickable = isVisited && !isCurrent;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            aria-label={getAriaLabel({
              index,
              displayIndex: visibleIndex + 1,
              isCurrent,
              isCompleted,
            })}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "h-1.5 w-7 rounded-full transition-colors",
              isCurrent || isCompleted ? "bg-zinc-900" : "bg-zinc-200",
              isClickable && "cursor-pointer hover:bg-zinc-700",
              !isClickable && "cursor-default",
            )}
          />
        );
      })}
    </div>
  );
}
