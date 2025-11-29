import { useState, useImperativeHandle, forwardRef } from "react";
import { type UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import type { ReformOptions } from "../../features/reform/types/reform";
import { FormItem } from "@/components/ui/form";

interface BulkApplySectionProps {
  setValue: UseFormSetValue<ReformOptions>;
  checkedIndices: number[];
  onApply?: () => void;
}

export interface BulkApplySectionRef {
  handleBulkApply: () => void;
}

const BulkApplySection = forwardRef<BulkApplySectionRef, BulkApplySectionProps>(
  ({ setValue, checkedIndices, onApply }, ref) => {
    const [measurementType, setMeasurementType] = useState<"length" | "height">(
      "length"
    );
    const [value, setValue_local] = useState<string>("");

    const handleBulkApply = () => {
      const numValue = Number(value);
      if (!numValue || numValue <= 0) return;

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
    };

    useImperativeHandle(ref, () => ({
      handleBulkApply,
    }));

    return (
      <div className="space-y-6">
        <FormItem className="flex">
          <Label>측정 방식</Label>
          <RadioGroup
            value={measurementType}
            onValueChange={(value) =>
              setMeasurementType(value as "length" | "height")
            }
            options={[
              { value: "length", label: "넥타이 길이" },
              { value: "height", label: "착용자 키" },
            ]}
          />
        </FormItem>

        <FormItem className="flex">
          <Label
            subLabel={measurementType === "length" ? "(매듭 포함)" : undefined}
          >
            {measurementType === "length" ? "넥타이 길이" : "착용자 키"}
          </Label>
          <Input
            type="number"
            placeholder={measurementType === "length" ? "예: 145" : "예: 175"}
            className="pr-8"
            value={value}
            onChange={(e) => setValue_local(e.target.value)}
            unit="cm"
          />
        </FormItem>
      </div>
    );
  }
);

export default BulkApplySection;
