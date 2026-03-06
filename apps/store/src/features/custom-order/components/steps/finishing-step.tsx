import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/composite/select-field";
import { CheckboxField } from "@/components/composite/check-box-field";
import {
  INTERLINING_TYPES,
  INTERLINING_THICKNESS,
} from "@/features/custom-order/constants/FORM_OPTIONS";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
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
      <Card>
        <CardHeader>
          <CardTitle>심지</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>추가 봉제</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>라벨</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </StepLayout>
  );
};
