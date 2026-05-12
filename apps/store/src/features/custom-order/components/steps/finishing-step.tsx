import { useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { SelectField } from "@/shared/composite/select-field";
import { CheckboxField } from "@/shared/composite/check-box-field";
import {
  INTERLINING_TYPES,
  INTERLINING_THICKNESS,
} from "@/features/custom-order/constants/FORM_OPTIONS";

export const FinishingStep = () => {
  const { control } = useFormContext<QuoteOrderOptions>();

  return (
    <div className="space-y-6">
      <UtilityPagePanel title="심지">
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
          />
          <CheckboxField name="careLabel" control={control} label="케어 라벨" />
        </div>
      </UtilityPagePanel>
    </div>
  );
};
