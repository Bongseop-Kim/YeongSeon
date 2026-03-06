import type { StepConfig } from "@/features/custom-order/types/wizard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StepIndicator } from "@/components/composite/step-indicator";

interface ProgressBarProps {
  steps: StepConfig[];
  currentStepIndex: number;
  visitedSteps: Set<number>;
  shouldShowStep: (index: number) => boolean;
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
  steps,
  currentStepIndex,
  visitedSteps,
  shouldShowStep,
  onStepClick,
}: ProgressBarProps) => {
  const currentStep = steps[currentStepIndex];
  const currentStepDescription =
    STEP_DESCRIPTIONS[currentStep.id] ?? "현재 단계를 진행 중입니다.";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>
            {`STEP ${currentStepIndex + 1} · ${currentStep.label}`}
            <CardDescription>{currentStepDescription}</CardDescription>
          </CardTitle>

          <div className="flex items-end">
            <StepIndicator
              steps={steps}
              currentStepIndex={currentStepIndex}
              visitedSteps={visitedSteps}
              shouldShowStep={shouldShowStep}
              onStepClick={onStepClick}
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
