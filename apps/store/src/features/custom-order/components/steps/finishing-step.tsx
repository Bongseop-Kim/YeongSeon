import { useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { SelectField } from "@/shared/composite/select-field";
import { CheckboxField } from "@/shared/composite/check-box-field";
import {
  INTERLINING_TYPES,
  INTERLINING_THICKNESS,
} from "@/features/custom-order/constants/FORM_OPTIONS";
import { StepLayout } from "./step-layout";

export const FinishingStep = () => {
  const { control } = useFormContext<QuoteOrderOptions>();

  return (
    <StepLayout
      guideTitle="마감 체크"
      guideItems={[
        "울 심지는 고급감 증가",
        "추가 봉제는 내구성 강화",
        "라벨은 브랜딩 완성도에 영향",
      ]}
    >
      <UtilityPagePanel
        title="심지"
        description="형태 유지감과 완성 톤을 결정하는 기본 마감입니다."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            name="interlining"
            control={control}
            label="심지 종류"
            options={INTERLINING_TYPES}
          />
          <SelectField
            name="interliningThickness"
            control={control}
            label="심지 두께"
            options={INTERLINING_THICKNESS}
          />
        </div>
      </UtilityPagePanel>

      <UtilityPagePanel title="추가 봉제">
        <div className="space-y-3">
          <CheckboxField
            name="triangleStitch"
            control={control}
            label="삼각 봉제"
          />
          <CheckboxField
            name="sideStitch"
            control={control}
            label="옆선 봉제"
          />
          <CheckboxField name="barTack" control={control} label="바택 처리" />
        </div>
      </UtilityPagePanel>

      <UtilityPagePanel title="라벨">
        <div className="space-y-2">
          <CheckboxField
            name="brandLabel"
            control={control}
            label="브랜드 라벨"
            description="고객의 브랜드 라벨을 부착합니다"
          />
          <CheckboxField
            name="careLabel"
            control={control}
            label="케어 라벨"
            description="세탁 방법 등의 케어 라벨을 부착합니다"
          />
        </div>
      </UtilityPagePanel>
    </StepLayout>
  );
};
