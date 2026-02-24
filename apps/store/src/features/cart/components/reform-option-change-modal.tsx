import { useState, forwardRef, useImperativeHandle } from "react";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import type { TieItem } from "@yeongseon/shared/types/view/reform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [measurementType, setMeasurementType] = useState<"length" | "height">(
    item.reformData.tie.measurementType || "length"
  );
  const [tieLength, setTieLength] = useState<number | undefined>(
    item.reformData.tie.tieLength
  );
  const [wearerHeight, setWearerHeight] = useState<number | undefined>(
    item.reformData.tie.wearerHeight
  );

  useImperativeHandle(ref, () => ({
    getValues: () => ({
      ...item.reformData.tie,
      measurementType,
      tieLength,
      wearerHeight,
    }),
  }));

  return (
    <div className="space-y-4">
      {/* 측정 방식 선택 */}
      <div className="space-y-2">
        <Label>측정 방식</Label>
        <Select
          value={measurementType}
          onValueChange={(value) =>
            setMeasurementType(value as "length" | "height")
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

      {/* 조건부 입력 필드 */}
      {measurementType === "length" ? (
        <div className="space-y-2">
          <Label>넥타이 길이 (cm)</Label>
          <Input
            type="number"
            value={tieLength || ""}
            onChange={(e) => setTieLength(Number(e.target.value))}
            placeholder="예: 145"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>착용자 키 (cm)</Label>
          <Input
            type="number"
            value={wearerHeight || ""}
            onChange={(e) => setWearerHeight(Number(e.target.value))}
            placeholder="예: 175"
          />
        </div>
      )}

      {/* 가격 표시 */}
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
