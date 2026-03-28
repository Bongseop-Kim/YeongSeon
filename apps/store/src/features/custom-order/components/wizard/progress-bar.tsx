import { useMemo } from "react";
import type { StepConfig } from "@/features/custom-order/types/wizard";
import { UtilityPageIntro } from "@/components/composite/utility-page";
import { StepIndicator } from "@/components/composite/step-indicator";

interface ProgressBarProps {
  eyebrow: string;
  pageTitle: string;
  pageDescription: string;
  steps: StepConfig[];
  currentStepIndex: number;
  visitedSteps: Set<number>;
  completedSteps: Set<number>;
  shouldShowStep: (index: number) => boolean;
  isHiddenStep: (index: number) => boolean;
  onStepClick: (index: number) => void;
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  quantity: "수량과 시작 방식을 먼저 결정해 주세요",
  fabric: "소재와 디자인 방식 조합을 선택해 주세요",
  sewing: "봉제 방식과 스타일을 정합니다",
  spec: "사이즈와 폭을 실제 착용감 기준으로 결정",
  finishing: "심지/추가봉제/라벨을 최종 마감 기준으로 설정",
  sample: "샘플 여부와 유형을 결정합니다",
  attachment: "이미지/메모를 업로드해 제작 오차를 줄입니다",
  confirm: "최종 주문 내역을 확인하고 제출합니다",
};

export const ProgressBar = ({
  eyebrow,
  pageTitle,
  pageDescription,
  steps,
  currentStepIndex,
  visitedSteps,
  completedSteps,
  shouldShowStep,
  isHiddenStep,
  onStepClick,
}: ProgressBarProps) => {
  const currentStep = steps[currentStepIndex];
  const currentStepDescription =
    STEP_DESCRIPTIONS[currentStep.id] ?? "현재 단계를 진행 중입니다.";

  const [visibleStepCount, currentDisplayStep] = useMemo(
    () =>
      steps.reduce(
        ([count, display], _, index) => {
          if (!shouldShowStep(index)) return [count, display];
          return [count + 1, index <= currentStepIndex ? display + 1 : display];
        },
        [0, 0],
      ),
    [steps, currentStepIndex, shouldShowStep],
  );

  return (
    <UtilityPageIntro
      eyebrow={eyebrow}
      title={pageTitle}
      description={pageDescription}
      meta={
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Current Step
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
              {currentStep.label}
            </p>
          </div>
          <p className="max-w-xl text-sm leading-6 text-zinc-600">
            {currentStepDescription}
          </p>
        </div>
      }
      trailing={
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Step {currentDisplayStep} of {visibleStepCount}
          </p>
          <StepIndicator
            steps={steps}
            currentStepIndex={currentStepIndex}
            visitedSteps={visitedSteps}
            completedSteps={completedSteps}
            shouldShowStep={shouldShowStep}
            isHiddenStep={isHiddenStep}
            onStepClick={onStepClick}
          />
        </div>
      }
    />
  );
};
