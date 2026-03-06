import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/composite/select-field";
import { CheckboxField } from "@/components/composite/check-box-field";
import {
  INTERLINING_TYPES,
  INTERLINING_THICKNESS,
} from "@/features/custom-order/constants/FORM_OPTIONS";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import { StepLayout } from "./step-layout";

export const FinishingStep = () => {
  const { control, watch } = useFormContext<QuoteOrderOptions>();

  const interlining = watch("interlining");
  const interliningThickness = watch("interliningThickness");
  const triangleStitch = watch("triangleStitch");
  const sideStitch = watch("sideStitch");
  const barTack = watch("barTack");
  const brandLabel = watch("brandLabel");
  const careLabel = watch("careLabel");

  const interliningLabel = [
    interlining === "WOOL" ? "울" : interlining ? "폴리" : null,
    interliningThickness === "THIN" ? "얇음" : interliningThickness ? "두꺼움" : null,
  ].filter(Boolean).join(", ") || "미선택";

  const stitchLabels = [
    triangleStitch && "삼각",
    sideStitch && "옆선",
    barTack && "바택",
  ].filter(Boolean);

  const labelLabels = [
    brandLabel && "브랜드",
    careLabel && "케어",
  ].filter(Boolean);

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
        <CardContent className="space-y-3 px-4 py-4">
          <div>
            <p>심지</p>
            <p className="mt-1 text-xs text-zinc-500">
              종류: {interliningLabel}
            </p>
          </div>
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
        <CardContent className="space-y-3 px-4 py-4">
          <div>
            <p>추가 봉제</p>
            <p className="mt-1 text-xs text-zinc-500">
              {stitchLabels.length > 0 ? stitchLabels.join(", ") : "없음"}
            </p>
          </div>
          <div className="space-y-2">
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
            <CheckboxField
              name="barTack"
              control={control}
              label="바택 처리"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 px-4 py-4">
          <div>
            <p>라벨</p>
            <p className="mt-1 text-xs text-zinc-500">
              {labelLabels.length > 0 ? labelLabels.join(", ") : "없음"}
            </p>
          </div>
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
