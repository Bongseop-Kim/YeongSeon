import { useState, useImperativeHandle, forwardRef } from "react";
import { type UseFormSetValue } from "react-hook-form";
import { Input } from "@/shared/ui-extended/input";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { toast } from "sonner";
import { type ReformOptions } from "@yeongseon/shared/types/view/reform";
import { cn } from "@/shared/lib/utils";
import { CheckIcon } from "lucide-react";

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
    const [measurementType, setMeasurementType] = useState<"length" | "height">(
      "length",
    );
    const [lengthValue, setLengthValue] = useState("");
    const [widthValue, setWidthValue] = useState("");

    const handleBulkApply = () => {
      if (checkedIndices.length === 0) {
        toast.error("적용할 항목을 선택해주세요.");
        return false;
      }

      if (!hasLengthReform && !hasWidthReform) {
        toast.error("수선 서비스를 하나 이상 선택해주세요.");
        return false;
      }

      if (hasLengthReform) {
        const lengthNum = Number(lengthValue);
        const valid =
          lengthValue.trim() !== "" &&
          !Number.isNaN(lengthNum) &&
          lengthNum > 0;
        if (!valid) {
          toast.error("측정 값을 입력해주세요.");
          return false;
        }
      }

      if (hasWidthReform) {
        const widthNum = Number(widthValue);
        const valid =
          widthValue.trim() !== "" && !Number.isNaN(widthNum) && widthNum > 0;
        if (!valid) {
          toast.error("원하는 폭을 입력해주세요.");
          return false;
        }
      }

      checkedIndices.forEach((i) => {
        if (hasLengthReform) {
          const lengthNum = Number(lengthValue);
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
        {/* 자동수선 카드 */}
        <div
          className={cn(
            "overflow-hidden rounded-md border transition-colors",
            hasLengthReform ? "border-brand-ink" : "border-border",
          )}
        >
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-[10px] text-left transition-colors",
              hasLengthReform
                ? "bg-brand-ink"
                : "bg-muted hover:bg-brand-paper-muted",
            )}
            onClick={() => setHasLengthReform((v) => !v)}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                hasLengthReform
                  ? "border-white bg-white/0"
                  : "border-input bg-white",
              )}
            >
              {hasLengthReform && <CheckIcon className="size-3 text-white" />}
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                hasLengthReform ? "text-white" : "text-foreground",
              )}
            >
              자동수선
            </span>
          </button>

          <div className="border-t border-border p-3">
            <div className="mb-3 flex overflow-hidden rounded-md border border-border bg-muted/40">
              {(["length", "height"] as const).map((type, i) => (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                    i > 0 && "border-l border-border",
                    measurementType === type
                      ? "bg-brand-ink text-white"
                      : "text-muted-foreground hover:bg-background",
                  )}
                  onClick={() => setMeasurementType(type)}
                >
                  {type === "length" ? "넥타이 길이" : "착용자 키"}
                </button>
              ))}
            </div>
            <Field orientation="vertical" className="gap-1">
              {measurementType === "length" && (
                <FieldDescription className="mt-0 text-xs">
                  (매듭 포함)
                </FieldDescription>
              )}
              <Input
                type="number"
                placeholder={
                  measurementType === "length" ? "예: 51" : "예: 175"
                }
                value={lengthValue}
                onChange={(e) => setLengthValue(e.target.value)}
                unit="cm"
              />
            </Field>
          </div>
        </div>

        {/* 폭수선 카드 */}
        <div
          className={cn(
            "overflow-hidden rounded-md border transition-colors",
            hasWidthReform ? "border-brand-ink" : "border-border",
          )}
        >
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-[10px] text-left transition-colors",
              hasWidthReform
                ? "bg-brand-ink"
                : "bg-muted hover:bg-brand-paper-muted",
            )}
            onClick={() => setHasWidthReform((v) => !v)}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                hasWidthReform
                  ? "border-white bg-white/0"
                  : "border-input bg-white",
              )}
            >
              {hasWidthReform && <CheckIcon className="size-3 text-white" />}
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                hasWidthReform ? "text-white" : "text-foreground",
              )}
            >
              폭수선
            </span>
          </button>

          <div className="border-t border-border p-3">
            <Field orientation="vertical" className="gap-1">
              <FieldLabel>
                <FieldTitle>원하는 폭</FieldTitle>
              </FieldLabel>
              <Input
                type="number"
                placeholder="예: 9"
                value={widthValue}
                onChange={(e) => setWidthValue(e.target.value)}
                unit="cm"
              />
            </Field>
          </div>
        </div>
      </div>
    );
  },
);

BulkApplySection.displayName = "BulkApplySection";

export default BulkApplySection;
