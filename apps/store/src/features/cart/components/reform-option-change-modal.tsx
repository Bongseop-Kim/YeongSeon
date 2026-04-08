import { useState, forwardRef, useImperativeHandle } from "react";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import {
  isMeasurementType,
  type TieItem,
} from "@yeongseon/shared/types/view/reform";
import { calcTieCost, useReformPricing } from "@/entities/reform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/shared/ui/field";
import { Input } from "@/shared/ui-extended/input";
import { Label } from "@/shared/ui/label";

interface ReformOptionChangeModalProps {
  item: ReformCartItem;
}

export interface ReformOptionChangeModalRef {
  getValues: () => TieItem;
}

export const ReformOptionChangeModal = forwardRef<
  ReformOptionChangeModalRef,
  ReformOptionChangeModalProps
>(({ item }, ref) => {
  const [hasLengthReform, setHasLengthReform] = useState(
    item.reformData.tie.hasLengthReform !== false,
  );
  const [hasWidthReform, setHasWidthReform] = useState(
    item.reformData.tie.hasWidthReform === true,
  );
  const [measurementType, setMeasurementType] = useState<"length" | "height">(
    item.reformData.tie.measurementType || "length",
  );
  const [tieLength, setTieLength] = useState<number | undefined>(
    item.reformData.tie.tieLength,
  );
  const [wearerHeight, setWearerHeight] = useState<number | undefined>(
    item.reformData.tie.wearerHeight,
  );
  const [targetWidth, setTargetWidth] = useState<number | undefined>(
    item.reformData.tie.targetWidth,
  );
  const { data: reformPricing } = useReformPricing();

  const currentTie: TieItem = {
    ...item.reformData.tie,
    hasLengthReform,
    hasWidthReform,
    measurementType,
    tieLength:
      hasLengthReform && measurementType === "length" ? tieLength : undefined,
    wearerHeight:
      hasLengthReform && measurementType === "height"
        ? wearerHeight
        : undefined,
    targetWidth: hasWidthReform ? targetWidth : undefined,
  };

  const dynamicCost =
    reformPricing &&
    Number.isFinite(reformPricing.baseCost) &&
    Number.isFinite(reformPricing.widthReformCost)
      ? calcTieCost(currentTie, {
          baseCost: reformPricing.baseCost,
          widthReformCost: reformPricing.widthReformCost,
        })
      : null;

  useImperativeHandle(ref, () => ({
    getValues: () => currentTie,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Field orientation="horizontal">
          <Checkbox
            id="has-length-reform"
            checked={hasLengthReform}
            onCheckedChange={(checked) => setHasLengthReform(checked === true)}
          />
          <FieldContent>
            <FieldLabel htmlFor="has-length-reform">
              <FieldTitle>자동수선</FieldTitle>
            </FieldLabel>
          </FieldContent>
        </Field>

        {hasLengthReform && (
          <>
            <div className="space-y-2">
              <Label>측정 방식</Label>
              <Select
                value={measurementType}
                onValueChange={(value) =>
                  setMeasurementType(
                    isMeasurementType(value) ? value : "length",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="length">넥타이 길이로 입력</SelectItem>
                  <SelectItem value="height">착용자 키로 입력</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {measurementType === "length" ? (
              <div className="space-y-2">
                <Label>넥타이 길이 (cm)</Label>
                <Input
                  type="number"
                  value={tieLength || ""}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setTieLength(
                      e.target.value === "" || Number.isNaN(value)
                        ? undefined
                        : value,
                    );
                  }}
                  placeholder="예: 51"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>착용자 키 (cm)</Label>
                <Input
                  type="number"
                  value={wearerHeight || ""}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setWearerHeight(
                      e.target.value === "" || Number.isNaN(value)
                        ? undefined
                        : value,
                    );
                  }}
                  placeholder="예: 175"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-3">
        <Field orientation="horizontal">
          <Checkbox
            id="has-width-reform"
            checked={hasWidthReform}
            onCheckedChange={(checked) => setHasWidthReform(checked === true)}
          />
          <FieldContent>
            <FieldLabel htmlFor="has-width-reform">
              <FieldTitle>폭수선</FieldTitle>
            </FieldLabel>
          </FieldContent>
        </Field>

        {hasWidthReform && (
          <div className="space-y-2">
            <Label>원하는 폭 (cm)</Label>
            <Input
              type="number"
              value={targetWidth || ""}
              onChange={(e) => {
                const value = Number(e.target.value);
                setTargetWidth(
                  e.target.value === "" || Number.isNaN(value)
                    ? undefined
                    : value,
                );
              }}
              placeholder="예: 9"
            />
          </div>
        )}
      </div>

      {!hasLengthReform && !hasWidthReform ? (
        <div className="text-sm text-destructive">
          수선 서비스를 하나 이상 선택해주세요.
        </div>
      ) : null}

      <div className="space-y-2 bg-zinc-100 p-4 rounded-sm">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-600">수선 비용</span>
          <span className="font-medium">
            {dynamicCost !== null
              ? `${dynamicCost.toLocaleString()}원`
              : "변동될 수 있음"}
          </span>
        </div>
      </div>
    </div>
  );
});

ReformOptionChangeModal.displayName = "ReformOptionChangeModal";
