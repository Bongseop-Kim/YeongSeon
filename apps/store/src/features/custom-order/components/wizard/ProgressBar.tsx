import { cn } from "@/lib/utils";
import type { StepConfig } from "@/features/custom-order/types/wizard";
import { Check } from "lucide-react";

interface ProgressBarProps {
  steps: StepConfig[];
  currentStepIndex: number;
  visitedSteps: Set<number>;
  shouldShowStep: (index: number) => boolean;
  onStepClick: (index: number) => void;
}

export const ProgressBar = ({
  steps,
  currentStepIndex,
  visitedSteps,
  shouldShowStep,
  onStepClick,
}: ProgressBarProps) => {
  return (
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isVisible = shouldShowStep(index);
          const isVisited = visitedSteps.has(index);
          const isCurrent = index === currentStepIndex;
          const isCompleted = isVisited && !isCurrent;
          const isClickable = isVisited && isVisible;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors shrink-0",
                  isCurrent && "bg-zinc-900 text-white",
                  isCompleted && "bg-zinc-200 text-zinc-700 hover:bg-zinc-300",
                  !isCurrent && !isCompleted && "bg-zinc-100 text-zinc-400",
                  !isVisible && "border-dashed border-2 border-zinc-200 bg-transparent text-zinc-300",
                  isClickable && !isCurrent && "cursor-pointer"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>

              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-px mx-2",
                    !isVisible
                      ? "border-t border-dashed border-zinc-200"
                      : isCompleted
                        ? "bg-zinc-300"
                        : "bg-zinc-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-1">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className={cn(
                "text-xs flex-1 last:flex-none",
                isCurrent ? "text-zinc-900 font-medium" : "text-zinc-400",
                !isLast && "pr-2"
              )}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
