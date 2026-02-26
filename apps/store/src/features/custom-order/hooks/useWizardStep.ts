import { useState, useCallback, useMemo } from "react";
import type { UseFormGetValues } from "react-hook-form";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { StepConfig } from "@/features/custom-order/types/wizard";

interface UseWizardStepOptions {
  steps: StepConfig[];
  getValues: UseFormGetValues<QuoteOrderOptions>;
}

export interface UseWizardStepReturn {
  currentStepIndex: number;
  currentStep: StepConfig;
  steps: StepConfig[];
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  goNext: () => string | null;
  goPrev: () => void;
  goToStep: (index: number) => void;
  resetTo: (stepIndex: number, visited: Set<number>) => void;
  visitedSteps: Set<number>;
  shouldShowStep: (index: number) => boolean;
}

export const useWizardStep = ({
  steps,
  getValues,
}: UseWizardStepOptions): UseWizardStepReturn => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
    () => new Set([0])
  );

  const totalSteps = steps.length;

  const shouldShowStep = useCallback(
    (index: number): boolean => {
      const step = steps[index];
      if (!step) return false;
      return !step.isSkippable(getValues());
    },
    [steps, getValues]
  );

  const findNextVisibleStep = useCallback(
    (fromIndex: number): number | null => {
      for (let i = fromIndex + 1; i < totalSteps; i++) {
        if (shouldShowStep(i)) return i;
      }
      return null;
    },
    [totalSteps, shouldShowStep]
  );

  const findPrevVisibleStep = useCallback(
    (fromIndex: number): number | null => {
      for (let i = fromIndex - 1; i >= 0; i--) {
        if (shouldShowStep(i)) return i;
      }
      return null;
    },
    [shouldShowStep]
  );

  const goNext = useCallback((): string | null => {
    if (steps.length === 0 || currentStepIndex < 0 || currentStepIndex >= steps.length) {
      return null;
    }
    const values = getValues();
    const currentStep = steps[currentStepIndex];
    const error = currentStep.validate(values);
    if (error) return error;

    const nextIndex = findNextVisibleStep(currentStepIndex);
    if (nextIndex !== null) {
      setCurrentStepIndex(nextIndex);
      setVisitedSteps((prev) => new Set([...prev, nextIndex]));
    }
    return null;
  }, [steps, currentStepIndex, getValues, findNextVisibleStep]);

  const goPrev = useCallback(() => {
    const prevIndex = findPrevVisibleStep(currentStepIndex);
    if (prevIndex !== null) {
      setCurrentStepIndex(prevIndex);
    }
  }, [currentStepIndex, findPrevVisibleStep]);

  const goToStep = useCallback(
    (index: number) => {
      if (visitedSteps.has(index) && shouldShowStep(index)) {
        setCurrentStepIndex(index);
      }
    },
    [visitedSteps, shouldShowStep]
  );

  const resetTo = useCallback(
    (stepIndex: number, visited: Set<number>) => {
      const clamped = Math.max(0, Math.min(stepIndex, steps.length - 1));
      setCurrentStepIndex(clamped);
      setVisitedSteps(visited);
    },
    [steps.length]
  );

  const currentStep =
    steps.length > 0 && currentStepIndex >= 0 && currentStepIndex < steps.length
      ? steps[currentStepIndex]
      : steps[0];
  const isFirstStep = findPrevVisibleStep(currentStepIndex) === null;
  const isLastStep = findNextVisibleStep(currentStepIndex) === null;

  return useMemo(
    () => ({
      currentStepIndex,
      currentStep,
      steps,
      totalSteps,
      isFirstStep,
      isLastStep,
      goNext,
      goPrev,
      goToStep,
      resetTo,
      visitedSteps,
      shouldShowStep,
    }),
    [
      currentStepIndex,
      currentStep,
      steps,
      totalSteps,
      isFirstStep,
      isLastStep,
      goNext,
      goPrev,
      goToStep,
      resetTo,
      visitedSteps,
      shouldShowStep,
    ]
  );
};
