import {
  type Control,
  Controller,
  type UseFormSetValue,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Copy } from "lucide-react";
import type { ReformOptions } from "../types/reform";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BulkApplySectionProps {
  control: Control<ReformOptions>;
  setValue: UseFormSetValue<ReformOptions>;
  tieCount: number;
}

const BulkApplySection = ({
  control,
  setValue,
  tieCount,
}: BulkApplySectionProps) => {
  const handleBulkApply = (data: {
    measurementType: "length" | "height";
    value: number;
  }) => {
    // 모든 넥타이에 일괄 적용
    for (let i = 0; i < tieCount; i++) {
      if (data.measurementType === "length") {
        setValue(`ties.${i}.tieLength`, data.value);
        setValue(`ties.${i}.wearerHeight`, undefined);
      } else {
        setValue(`ties.${i}.wearerHeight`, data.value);
        setValue(`ties.${i}.tieLength`, undefined);
      }
    }
  };

  return (
    <>
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-stone-900 flex items-center gap-2">
            <Copy className="h-5 w-5 text-stone-600" />
            일괄 적용
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-stone-900">
              측정 방식
            </Label>
            <Controller
              name="bulkApply"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={
                    field.value?.currentMeasurementType ? "length" : "height"
                  }
                  onValueChange={(value) => {
                    if (value === "length") {
                      field.onChange({
                        ...field.value,
                        currentMeasurementType: "length",
                      });
                    } else {
                      field.onChange({
                        ...field.value,
                        currentMeasurementType: "height",
                      });
                    }
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="length" id="length" />
                    <Label htmlFor="length" className="text-sm">
                      넥타이 길이
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="height" id="height" />
                    <Label htmlFor="height" className="text-sm">
                      착용자 키
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* 측정값 입력 */}
          <Controller
            name="bulkApply"
            control={control}
            render={({ field }) => {
              const isLength =
                !!field.value?.tieLength || field.value?.tieLength === 0;
              return (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-stone-900">
                    {isLength ? "넥타이 길이 (매듭 포함)" : "착용자 키"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder={isLength ? "예: 145" : "예: 175"}
                      className="pr-8"
                      value={
                        isLength
                          ? field.value?.tieLength || ""
                          : field.value?.wearerHeight || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : undefined;
                        if (isLength) {
                          field.onChange({
                            ...field.value,
                            tieLength: value,
                          });
                        } else {
                          field.onChange({
                            ...field.value,
                            wearerHeight: value,
                          });
                        }
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                      cm
                    </span>
                  </div>
                </div>
              );
            }}
          />
        </CardContent>
      </Card>

      {/* 적용 버튼 */}
      <Controller
        name="bulkApply"
        control={control}
        render={({ field }) => (
          <Button
            type="button"
            size="lg"
            onClick={() => {
              const measurementType = field.value?.tieLength
                ? "length"
                : "height";
              const value = field.value?.tieLength || field.value?.wearerHeight;

              if (value) {
                handleBulkApply({
                  measurementType,
                  value,
                });
              }
            }}
            className="w-full h-12 text-base font-medium bg-stone-900 hover:bg-stone-800"
          >
            일괄 적용하기
          </Button>
        )}
      />
    </>
  );
};

export default BulkApplySection;
