import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { useWizardStep } from "@/features/custom-order/hooks/useWizardStep";
import type { StepConfig } from "@/features/custom-order/types/wizard";

const values: QuoteOrderOptions = {
  fabricProvided: false,
  reorder: false,
  fabricType: "SILK",
  designType: "PRINTING",
  tieType: null,
  interlining: null,
  interliningThickness: null,
  sizeType: "ADULT",
  tieWidth: 8,
  triangleStitch: false,
  sideStitch: false,
  barTack: false,
  fold7: false,
  dimple: false,
  spoderato: false,
  brandLabel: false,
  careLabel: false,
  quantity: 10,
  referenceImages: null,
  additionalNotes: "",
  contactName: "홍길동",
  contactTitle: "담당자",
  contactMethod: "email",
  contactValue: "hello@example.com",
};

const steps: StepConfig[] = [
  {
    id: "quantity",
    label: "수량",
    validate: () => null,
    isSkippable: () => false,
  },
  {
    id: "fabric",
    label: "원단",
    validate: () => null,
    isSkippable: () => true,
  },
  {
    id: "sewing",
    label: "봉제",
    validate: (current) => (current.quantity < 10 ? "수량 부족" : null),
    isSkippable: () => false,
  },
  {
    id: "confirm",
    label: "확인",
    validate: () => null,
    isSkippable: () => false,
  },
];

const useWizardStepHarness = (
  currentSteps: StepConfig[],
  defaultValues: QuoteOrderOptions,
) => {
  const form = useForm<QuoteOrderOptions>({ defaultValues });

  return useWizardStep({
    steps: currentSteps,
    getValues: form.getValues,
  });
};

describe("useWizardStep", () => {
  it("스킵 가능한 스텝을 건너뛰며 이동하고 완료 상태를 누적한다", () => {
    const { result } = renderHook(() => useWizardStepHarness(steps, values));

    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.shouldShowStep(1)).toBe(false);

    act(() => {
      expect(result.current.goNext()).toBeNull();
    });

    expect(result.current.currentStepIndex).toBe(2);
    expect([...result.current.visitedSteps]).toEqual([0, 2]);
    expect([...result.current.completedSteps]).toEqual([0, 1]);

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.currentStepIndex).toBe(0);

    act(() => {
      result.current.goToStep(2);
    });
    expect(result.current.currentStepIndex).toBe(2);

    act(() => {
      result.current.forceGoToStep(3);
    });
    expect(result.current.currentStepIndex).toBe(3);
    expect(result.current.isLastStep).toBe(true);
  });

  it("검증 실패, 잘못된 이동, resetTo, step length 보정을 처리한다", () => {
    const shortValues = { ...values, quantity: 1 };
    const { result, rerender } = renderHook(
      ({ currentSteps, currentValues }) =>
        useWizardStepHarness(currentSteps, currentValues),
      { initialProps: { currentSteps: steps, currentValues: shortValues } },
    );

    act(() => {
      result.current.forceGoToStep(2);
    });
    act(() => {
      expect(result.current.goNext()).toBe("수량 부족");
    });
    expect(result.current.currentStepIndex).toBe(2);

    act(() => {
      result.current.goToStep(1);
      result.current.forceGoToStep(10);
    });
    expect(result.current.currentStepIndex).toBe(2);

    act(() => {
      result.current.resetTo(10, new Set([0, 2]));
    });
    expect(result.current.currentStepIndex).toBe(3);
    expect([...result.current.completedSteps]).toEqual([0, 1, 2]);

    rerender({ currentSteps: steps.slice(0, 2), currentValues: shortValues });
    expect(result.current.currentStepIndex).toBe(1);
  });
});
