import { useState, useCallback, useMemo, useEffect } from "react";
import type { UseFormGetValues } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import type { StepConfig } from "@/features/custom-order/types/wizard";

interface UseWizardStepOptions {
  steps: StepConfig[];
  getValues: UseFormGetValues<QuoteOrderOptions>;
}

interface UseWizardStepReturn {
  currentStepIndex: number;
  currentStep: StepConfig;
  steps: StepConfig[];
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  goNext: () => string | null;
  goPrev: () => void;
  goToStep: (index: number) => void;
  forceGoToStep: (index: number) => void;
  skipToStep: (index: number) => void;
  resetTo: (stepIndex: number, visited: Set<number>) => void;
  visitedSteps: Set<number>;
  completedSteps: Set<number>;
  shouldShowStep: (index: number) => boolean;
}

export const useWizardStep = ({
  steps,
  getValues,
}: UseWizardStepOptions): UseWizardStepReturn => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
    () => new Set([0]),
  );
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set<number>(),
  );

  const totalSteps = steps.length;

  const shouldShowStep = useCallback(
    (index: number): boolean => {
      const step = steps[index];
      if (!step) return false;
      return !step.isSkippable(getValues());
    },
    [steps, getValues],
  );

  const findNextVisibleStep = useCallback(
    (fromIndex: number): number | null => {
      for (let i = fromIndex + 1; i < totalSteps; i++) {
        if (shouldShowStep(i)) return i;
      }
      return null;
    },
    [totalSteps, shouldShowStep],
  );

  const findPrevVisibleStep = useCallback(
    (fromIndex: number): number | null => {
      for (let i = fromIndex - 1; i >= 0; i--) {
        if (shouldShowStep(i)) return i;
      }
      return null;
    },
    [shouldShowStep],
  );

  const goNext = useCallback((): string | null => {
    if (
      steps.length === 0 ||
      currentStepIndex < 0 ||
      currentStepIndex >= steps.length
    ) {
      return null;
    }
    const values = getValues();
    const currentStep = steps[currentStepIndex];
    const error = currentStep.validate(values);
    if (error) return error;

    const nextIndex = findNextVisibleStep(currentStepIndex);
    if (nextIndex !== null) {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        // 의도된 동작: currentStepIndex ~ nextIndex-1 사이의 스킵된 스텝도 completed로 표시한다.
        // 사이즈·상세옵션·샘플 스텝은 isSkippable=true이고 기본값이 설정되어 있어,
        // 사용자가 별도로 진입하지 않아도 기본값으로 주문이 완성된 것으로 간주한다.
        // 따라서 실제 방문 여부를 따지지 않고 인덱스 범위만으로 일괄 완료 처리하는 것이 맞다.
        for (let i = currentStepIndex; i < nextIndex; i++) {
          next.add(i);
        }
        return next;
      });
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
    [visitedSteps, shouldShowStep],
  );

  const forceGoToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length && shouldShowStep(index)) {
        setCurrentStepIndex(index);
        setVisitedSteps((prev) => new Set([...prev, index]));
      }
    },
    [steps.length, shouldShowStep],
  );

  const skipToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setCurrentStepIndex(index);
      setVisitedSteps(() => {
        const next = new Set<number>();
        for (let i = 0; i <= index; i++) next.add(i);
        return next;
      });
      setCompletedSteps(() => {
        const next = new Set<number>();
        for (let i = 0; i < index; i++) next.add(i);
        return next;
      });
    },
    [steps.length],
  );

  const resetTo = useCallback(
    (stepIndex: number, visited: Set<number>) => {
      const clamped = Math.max(0, Math.min(stepIndex, steps.length - 1));
      setCurrentStepIndex(clamped);
      setVisitedSteps(visited);
      // 의도된 동작: 복원 시 현재 스텝 이전 인덱스를 모두 completed로 간주한다.
      // 스킵 가능한 스텝(사이즈·상세옵션·샘플)은 기본값이 있으므로 방문 이력 없이도
      // 완료 상태로 복원하는 것이 올바르다. goNext와 동일한 의도.
      const restored = new Set<number>();
      for (let i = 0; i < clamped; i++) {
        restored.add(i);
      }
      setCompletedSteps(restored);
    },
    [steps.length],
  );

  // steps 배열 변경 시 currentStepIndex가 범위를 벗어나면 자동 보정
  useEffect(() => {
    if (currentStepIndex >= steps.length) {
      setCurrentStepIndex(Math.max(0, steps.length - 1));
    }
  }, [steps.length, currentStepIndex]);

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
      forceGoToStep,
      skipToStep,
      resetTo,
      visitedSteps,
      completedSteps,
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
      forceGoToStep,
      skipToStep,
      resetTo,
      visitedSteps,
      completedSteps,
      shouldShowStep,
    ],
  );
};
