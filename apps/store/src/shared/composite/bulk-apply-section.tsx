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
    const [value, setValue_local] = useState<string>("");

    const handleBulkApply = () => {
      if (checkedIndices.length === 0) {
        toast.error("적용할 항목을 선택해주세요.");
        return false;
      }

      if (value.trim() === "" || Number.isNaN(Number(value))) {
        toast.error("유효한 숫자를 입력해주세요.");
        return false;
      }

      const numValue = Number(value);
      if (numValue <= 0) {
        toast.error("0보다 큰 값을 입력해주세요.");
        return false;
      }

      // 체크된 넥타이에만 일괄 적용
      checkedIndices.forEach((i) => {
        if (measurementType === "length") {
          setValue(`ties.${i}.measurementType`, "length");
          setValue(`ties.${i}.tieLength`, numValue);
          setValue(`ties.${i}.wearerHeight`, undefined);
        } else {
          setValue(`ties.${i}.measurementType`, "height");
          setValue(`ties.${i}.wearerHeight`, numValue);
          setValue(`ties.${i}.tieLength`, undefined);
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
            value={value}
            onChange={(e) => setValue_local(e.target.value)}
            unit="cm"
          />
        </Field>
      </div>
    );
  },
);

export default BulkApplySection;
