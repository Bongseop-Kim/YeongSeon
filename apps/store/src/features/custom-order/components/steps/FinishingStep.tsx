import { useFormContext } from "react-hook-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SelectField } from "@/components/composite/select-field";
import { CheckboxField } from "@/components/composite/check-box-field";
import {
  INTERLINING_TYPES,
  INTERLINING_THICKNESS,
} from "@/features/custom-order/constants/FORM_OPTIONS";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          마감 옵션을 설정해주세요
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          기본값으로 진행하셔도 좋습니다
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["interlining"]} className="space-y-3">
        {/* Interlining Group */}
        <AccordionItem value="interlining" className="border rounded-lg px-4">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">심지</span>
              <span className="text-sm text-zinc-500">{interliningLabel}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
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
          </AccordionContent>
        </AccordionItem>

        {/* Additional Stitching Group */}
        <AccordionItem value="stitching" className="border rounded-lg px-4">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">추가 봉제</span>
              <span className="text-sm text-zinc-500">
                {stitchLabels.length > 0
                  ? stitchLabels.join(", ")
                  : "없음"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
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
          </AccordionContent>
        </AccordionItem>

        {/* Label Group */}
        <AccordionItem value="labels" className="border rounded-lg px-4">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">라벨</span>
              <span className="text-sm text-zinc-500">
                {labelLabels.length > 0
                  ? labelLabels.join(", ")
                  : "없음"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
