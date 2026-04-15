import { forwardRef, useImperativeHandle, useState } from "react";
import { type UseFormSetValue } from "react-hook-form";
import { CheckIcon } from "lucide-react";

import { type ReformOptions } from "@yeongseon/shared/types/view/reform";
import { DimpleSegment } from "@/shared/composite/dimple-segment";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui-extended/input";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { Required } from "@/shared/ui/required";

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
    const [hasLengthReform, setHasLengthReform] = useState(false);
    const [hasWidthReform, setHasWidthReform] = useState(false);
    const [dimple, setDimple] = useState(false);
    const [lengthValue, setLengthValue] = useState("");
    const [widthValue, setWidthValue] = useState("");
    const [lengthError, setLengthError] = useState<string | null>(null);
    const [widthError, setWidthError] = useState<string | null>(null);
    const [serviceError, setServiceError] = useState<string | null>(null);

    const handleBulkApply = () => {
      setLengthError(null);
      setWidthError(null);
      setServiceError(null);

      if (!hasLengthReform && !hasWidthReform) {
        setServiceError("수선 서비스를 하나 이상 선택해주세요.");
        return false;
      }

      let hasError = false;

      if (hasLengthReform) {
        const lengthNum = Number(lengthValue);
        const valid =
          lengthValue.trim() !== "" &&
          !Number.isNaN(lengthNum) &&
          lengthNum > 0;
        if (!valid) {
          setLengthError("착용자 키를 입력해주세요");
          hasError = true;
        }
      }

      if (hasWidthReform) {
        const widthNum = Number(widthValue);
        const valid =
          widthValue.trim() !== "" && !Number.isNaN(widthNum) && widthNum > 0;
        if (!valid) {
          setWidthError("원하는 폭을 입력해주세요");
          hasError = true;
        }
      }

      if (hasError) return false;

      checkedIndices.forEach((i) => {
        if (hasLengthReform) {
          const lengthNum = Number(lengthValue);
          setValue(`ties.${i}.hasLengthReform`, true);
          setValue(`ties.${i}.measurementType`, "height");
          setValue(`ties.${i}.wearerHeight`, lengthNum);
          setValue(`ties.${i}.tieLength`, undefined);
          setValue(`ties.${i}.dimple`, dimple);
        }

        if (hasWidthReform) {
          const widthNum = Number(widthValue);
          setValue(`ties.${i}.hasWidthReform`, true);
          setValue(`ties.${i}.targetWidth`, widthNum);
        }
      });

      onApply?.();
      return true;
    };

    useImperativeHandle(ref, () => ({ handleBulkApply }));

    return (
      <div className="space-y-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Field
              orientation="horizontal"
              className="w-fit cursor-pointer gap-2"
            >
              <FieldContent
                className={cn(
                  "flex-none size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                  hasLengthReform
                    ? "border-brand-ink bg-brand-ink"
                    : "border-input bg-white",
                )}
              >
                <input
                  type="checkbox"
                  id="bulk-length-reform"
                  className="sr-only"
                  checked={hasLengthReform}
                  onChange={(e) => {
                    setHasLengthReform(e.target.checked);
                    setLengthError(null);
                    setServiceError(null);
                  }}
                />
                {hasLengthReform && <CheckIcon className="size-3 text-white" />}
              </FieldContent>
              <FieldLabel htmlFor="bulk-length-reform">
                <FieldTitle>자동수선</FieldTitle>
              </FieldLabel>
            </Field>
            <DimpleSegment
              value={dimple}
              onChange={setDimple}
              disabled={!hasLengthReform}
            />
          </div>

          <Field orientation="vertical" className="gap-1">
            <FieldLabel>
              <FieldTitle>
                {hasLengthReform && <Required />}
                착용자 키
              </FieldTitle>
            </FieldLabel>
            <FieldContent>
              <Input
                type="number"
                placeholder="예: 175"
                value={lengthValue}
                onChange={(e) => setLengthValue(e.target.value)}
                unit="cm"
              />
            </FieldContent>
          </Field>
          {lengthError && <FieldError errors={[{ message: lengthError }]} />}
        </div>

        <hr className="border-border" />

        <div className="space-y-2">
          <Field
            orientation="horizontal"
            className="w-fit cursor-pointer gap-2"
          >
            <FieldContent
              className={cn(
                "flex-none size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                hasWidthReform
                  ? "border-brand-ink bg-brand-ink"
                  : "border-input bg-white",
              )}
            >
              <input
                type="checkbox"
                id="bulk-width-reform"
                className="sr-only"
                checked={hasWidthReform}
                onChange={(e) => {
                  setHasWidthReform(e.target.checked);
                  setWidthError(null);
                  setServiceError(null);
                }}
              />
              {hasWidthReform && <CheckIcon className="size-3 text-white" />}
            </FieldContent>
            <FieldLabel htmlFor="bulk-width-reform">
              <FieldTitle>폭수선</FieldTitle>
            </FieldLabel>
          </Field>

          <Field orientation="vertical" className="gap-1">
            <FieldLabel>
              <FieldTitle>
                {hasWidthReform && <Required />}
                원하는 폭
              </FieldTitle>
            </FieldLabel>
            <FieldContent>
              <Input
                type="number"
                placeholder="예: 9"
                value={widthValue}
                onChange={(e) => setWidthValue(e.target.value)}
                unit="cm"
              />
            </FieldContent>
          </Field>
          {widthError && <FieldError errors={[{ message: widthError }]} />}
        </div>

        {serviceError && <FieldError errors={[{ message: serviceError }]} />}
      </div>
    );
  },
);

BulkApplySection.displayName = "BulkApplySection";

export default BulkApplySection;
