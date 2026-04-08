import { useState, forwardRef, useImperativeHandle } from "react";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import {
  isMeasurementType,
  type TieItem,
} from "@yeongseon/shared/types/view/reform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
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

  useImperativeHandle(ref, () => ({
    getValues: () => ({
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
    }),
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasLengthReform}
            onChange={(e) => setHasLengthReform(e.target.checked)}
          />
          자동수선
        </Label>

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
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasWidthReform}
            onChange={(e) => setHasWidthReform(e.target.checked)}
          />
          폭수선
        </Label>

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
            {item.reformData.cost.toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
});

ReformOptionChangeModal.displayName = "ReformOptionChangeModal";
