import { useState } from "react";
import { type Control, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import type { ReformOptions } from "../types/reform";

interface TieItemCardProps {
  index: number;
  control: Control<ReformOptions>;
  onRemove: () => void;
  showRemoveButton: boolean;
}

const TieItemCard = ({
  index,
  control,
  onRemove,
  showRemoveButton,
}: TieItemCardProps) => {
  const [measurementType, setMeasurementType] = useState<"length" | "height">(
    "length"
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (
    file: File | undefined,
    onChange: (file: File | undefined) => void
  ) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    } else {
      setImagePreview(null);
      onChange(undefined);
    }
  };

  return (
    <Card className="border-stone-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium text-stone-900">
          넥타이 #{index + 1}
        </CardTitle>
        {showRemoveButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-stone-500 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 넥타이 사진 업로드 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-stone-900">
            넥타이 사진{" "}
            <span className="text-stone-500 font-normal">(선택사항)</span>
          </Label>
          <Controller
            name={`ties.${index}.image`}
            control={control}
            render={({ field }) => (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="relative"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        handleImageChange(file, field.onChange);
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    사진 선택
                  </Button>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleImageChange(undefined, field.onChange)
                      }
                      className="text-stone-500 hover:text-stone-700"
                    >
                      제거
                    </Button>
                  )}
                </div>
                {imagePreview && (
                  <div className="relative w-32 h-32 border border-stone-200 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="넥타이 미리보기"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {!imagePreview && field.value && (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <ImageIcon className="h-4 w-4" />
                    {field.value.name}
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* 측정 방식 선택 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-stone-900">
            측정 방식 <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={measurementType}
            onValueChange={(value) =>
              setMeasurementType(value as "length" | "height")
            }
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="length" id={`length-${index}`} />
              <Label htmlFor={`length-${index}`} className="text-sm">
                넥타이 길이
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="height" id={`height-${index}`} />
              <Label htmlFor={`height-${index}`} className="text-sm">
                착용자 키
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 측정값 입력 */}
        {measurementType === "length" ? (
          <div className="space-y-2">
            <Label
              htmlFor={`tie-length-${index}`}
              className="text-sm font-medium text-stone-900"
            >
              넥타이 길이 (매듭 포함) <span className="text-red-500">*</span>
            </Label>
            <Controller
              name={`ties.${index}.tieLength`}
              control={control}
              rules={{
                required:
                  measurementType === "length"
                    ? "넥타이 길이를 입력해주세요"
                    : false,
              }}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      {...field}
                      id={`tie-length-${index}`}
                      type="number"
                      placeholder="예: 145"
                      className="pr-8"
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                      cm
                    </span>
                  </div>
                  {fieldState.error && (
                    <p className="text-sm text-red-600">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label
              htmlFor={`wearer-height-${index}`}
              className="text-sm font-medium text-stone-900"
            >
              착용자 키 <span className="text-red-500">*</span>
            </Label>
            <Controller
              name={`ties.${index}.wearerHeight`}
              control={control}
              rules={{
                required:
                  measurementType === "height"
                    ? "착용자 키를 입력해주세요"
                    : false,
              }}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      {...field}
                      id={`wearer-height-${index}`}
                      type="number"
                      placeholder="예: 175"
                      className="pr-8"
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                      cm
                    </span>
                  </div>
                  {fieldState.error && (
                    <p className="text-sm text-red-600">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        )}

        {/* 추가 요청사항 */}
        <div className="space-y-2">
          <Label
            htmlFor={`notes-${index}`}
            className="text-sm font-medium text-stone-900"
          >
            추가 요청사항
          </Label>
          <Controller
            name={`ties.${index}.notes`}
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id={`notes-${index}`}
                placeholder="이 넥타이에 대한 특별한 요청사항이 있으시면 적어주세요"
                className="min-h-[80px] resize-none"
                value={field.value || ""}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TieItemCard;
