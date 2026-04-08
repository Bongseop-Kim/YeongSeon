import { useState, useImperativeHandle, forwardRef } from "react";
import { type UseFormSetValue } from "react-hook-form";
import { Input } from "@/shared/ui-extended/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { toast } from "sonner";
import {
  isMeasurementType,
  type ReformOptions,
} from "@yeongseon/shared/types/view/reform";

interface BulkApplySectionProps {
  setValue: UseFormSetValue<ReformOptions>;
  checkedIndices: number[];
  onApply?: () => void;
}

export interface BulkApplySectionRef {
  handleBulkApply: () => boolean | Promise<boolean>;
}

const BulkApplySection = forwardRef<BulkApplySectionRef, BulkApplySectionProps>(
  ({ setValue, checkedIndices, onApply }, ref) => {
    const [measurementType, setMeasurementType] = useState<"length" | "height">(
      "length",
    );
    const [lengthValue, setLengthValue] = useState<string>("");
    const [widthValue, setWidthValue] = useState<string>("");

    const handleBulkApply = () => {
      if (checkedIndices.length === 0) {
        toast.error("적용할 항목을 선택해주세요.");
        return false;
      }

      const lengthNum = Number(lengthValue);
      const widthNum = Number(widthValue);
      const hasValidLength =
        lengthValue.trim() !== "" && !Number.isNaN(lengthNum) && lengthNum > 0;
      const hasValidWidth =
        widthValue.trim() !== "" && !Number.isNaN(widthNum) && widthNum > 0;

      if (!hasValidLength && !hasValidWidth) {
        toast.error("자동수선 또는 폭수선 값을 하나 이상 입력해주세요.");
        return false;
      }

      checkedIndices.forEach((i) => {
        if (hasValidLength) {
          setValue(`ties.${i}.hasLengthReform`, true);
          if (measurementType === "length") {
            setValue(`ties.${i}.measurementType`, "length");
            setValue(`ties.${i}.tieLength`, lengthNum);
            setValue(`ties.${i}.wearerHeight`, undefined);
          } else {
            setValue(`ties.${i}.measurementType`, "height");
            setValue(`ties.${i}.wearerHeight`, lengthNum);
            setValue(`ties.${i}.tieLength`, undefined);
          }
        }

        if (hasValidWidth) {
          setValue(`ties.${i}.hasWidthReform`, true);
          setValue(`ties.${i}.targetWidth`, widthNum);
        }
      });

      onApply?.();
      return true;
    };

    useImperativeHandle(ref, () => ({
      handleBulkApply,
    }));

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <FieldTitle>자동수선</FieldTitle>

          <Field orientation="vertical" className="gap-3">
            <FieldContent className="gap-2">
              <FieldLabel>
                <FieldTitle>측정 방식</FieldTitle>
              </FieldLabel>
            </FieldContent>
            <RadioGroup
              value={measurementType}
              onValueChange={(value) =>
                setMeasurementType(isMeasurementType(value) ? value : "length")
              }
              className="gap-2"
            >
              <FieldLabel htmlFor="bulk-measurement-length">
                <Field orientation="horizontal" className="items-center gap-3">
                  <FieldContent className="gap-0">
                    <FieldTitle>넥타이 길이</FieldTitle>
                  </FieldContent>
                  <RadioGroupItem value="length" id="bulk-measurement-length" />
                </Field>
              </FieldLabel>
              <FieldLabel htmlFor="bulk-measurement-height">
                <Field orientation="horizontal" className="items-center gap-3">
                  <FieldContent className="gap-0">
                    <FieldTitle>착용자 키</FieldTitle>
                  </FieldContent>
                  <RadioGroupItem value="height" id="bulk-measurement-height" />
                </Field>
              </FieldLabel>
            </RadioGroup>
          </Field>

          <Field orientation="vertical" className="gap-2">
            <FieldContent className="gap-1">
              <FieldLabel htmlFor="bulk-measurement-value">
                <FieldTitle>
                  {measurementType === "length" ? "넥타이 길이" : "착용자 키"}
                </FieldTitle>
              </FieldLabel>
              {measurementType === "length" ? (
                <FieldDescription className="mt-0 text-xs">
                  (매듭 포함)
                </FieldDescription>
              ) : null}
            </FieldContent>
            <Input
              id="bulk-measurement-value"
              type="number"
              placeholder={measurementType === "length" ? "예: 51" : "예: 175"}
              className="pr-8"
              value={lengthValue}
              onChange={(e) => setLengthValue(e.target.value)}
              unit="cm"
            />
          </Field>
        </div>

        <div className="space-y-4">
          <FieldTitle>폭수선</FieldTitle>

          <Field orientation="vertical" className="gap-2">
            <FieldContent className="gap-1">
              <FieldLabel htmlFor="bulk-width-value">
                <FieldTitle>원하는 폭</FieldTitle>
              </FieldLabel>
            </FieldContent>
            <Input
              id="bulk-width-value"
              type="number"
              placeholder="예: 9"
              className="pr-8"
              value={widthValue}
              onChange={(e) => setWidthValue(e.target.value)}
              unit="cm"
            />
          </Field>
        </div>
      </div>
    );
  },
);

export default BulkApplySection;
