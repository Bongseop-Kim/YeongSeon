import { forwardRef, useImperativeHandle, useState } from "react";
import { CheckIcon } from "lucide-react";

import { calcTieCost, useReformPricing } from "@/entities/reform";
import { DimpleSegment } from "@/shared/composite/dimple-segment";
import { cn } from "@/shared/lib/utils";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui-extended/input";
import { Required } from "@/shared/ui/required";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import type { TieItem } from "@yeongseon/shared/types/view/reform";

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
  const [dimple, setDimple] = useState(item.reformData.tie.dimple ?? false);
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
    measurementType: "height",
    tieLength: undefined,
    wearerHeight: hasLengthReform ? wearerHeight : undefined,
    targetWidth: hasWidthReform ? targetWidth : undefined,
    dimple,
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
                id="has-length-reform"
                className="sr-only"
                checked={hasLengthReform}
                onChange={(e) => setHasLengthReform(e.target.checked)}
              />
              {hasLengthReform && <CheckIcon className="size-3 text-white" />}
            </FieldContent>
            <FieldLabel htmlFor="has-length-reform">
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
              value={wearerHeight ?? ""}
              onChange={(e) => {
                const value = Number(e.target.value);
                setWearerHeight(
                  e.target.value === "" || Number.isNaN(value)
                    ? undefined
                    : value,
                );
              }}
              placeholder="예: 175"
              unit="cm"
            />
          </FieldContent>
        </Field>
      </div>

      <hr className="border-border" />

      <div className="space-y-3">
        <Field orientation="horizontal" className="w-fit cursor-pointer gap-2">
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
              id="has-width-reform"
              className="sr-only"
              checked={hasWidthReform}
              onChange={(e) => setHasWidthReform(e.target.checked)}
            />
            {hasWidthReform && <CheckIcon className="size-3 text-white" />}
          </FieldContent>
          <FieldLabel htmlFor="has-width-reform">
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
              value={targetWidth ?? ""}
              onChange={(e) => {
                const value = Number(e.target.value);
                setTargetWidth(
                  e.target.value === "" || Number.isNaN(value)
                    ? undefined
                    : value,
                );
              }}
              placeholder="예: 9"
              unit="cm"
            />
          </FieldContent>
        </Field>
      </div>

      {!hasLengthReform && !hasWidthReform ? (
        <FieldError
          errors={[{ message: "수선 서비스를 하나 이상 선택해주세요." }]}
        />
      ) : null}

      <div className="rounded-sm bg-muted p-4 space-y-2">
        <div className="flex items-center justify-between">
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
