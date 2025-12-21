import { type Control } from "react-hook-form";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { ReformOptions } from "../types/reform";
import { ImagePicker } from "@/components/composite/image-picker";
import { Checkbox } from "@/components/ui/checkbox";
import CloseButton from "@/components/ui/close";
import { Required } from "@/components/ui/required";

interface TieItemCardProps {
  index: number;
  control: Control<ReformOptions>;
  onRemove: () => void;
}

const TieItemCard = ({ index, control, onRemove }: TieItemCardProps) => {
  return (
    <CardContent className="flex gap-4 py-2">
      <FormField
        control={control}
        name={`ties.${index}.checked`}
        render={({ field }) => (
          <Checkbox
            checked={field.value || false}
            onCheckedChange={field.onChange}
          />
        )}
      />

      {/* 넥타이 사진 업로드 */}
      <FormField
        control={control}
        name={`ties.${index}.image`}
        render={({ field }) => (
          <FormItem>
            <FormLabel subLabel="(선택사항)">넥타이 사진</FormLabel>
            <FormControl>
              <ImagePicker
                selectedFile={
                  field.value instanceof File ? field.value : undefined
                }
                onFileChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="space-y-6 w-full">
        {/* 측정 방식 선택 */}
        <FormField
          control={control}
          name={`ties.${index}.measurementType`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>측정 방식</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value || "length"}
                  onValueChange={(value) => {
                    field.onChange(value as "length" | "height");
                  }}
                  options={[
                    { value: "length", label: "넥타이 길이" },
                    { value: "height", label: "착용자 키" },
                  ]}
                  namePrefix={`measurement-${index}`}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 측정값 입력 */}
        <FormField
          control={control}
          name={`ties.${index}.measurementType`}
          render={({ field: measurementField }) => {
            const currentMeasurementType = measurementField.value || "length";

            return currentMeasurementType === "length" ? (
              <FormField
                control={control}
                name={`ties.${index}.tieLength`}
                rules={{
                  required: "넥타이 길이를 입력해주세요",
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      htmlFor={`tie-length-${index}`}
                      subLabel="(매듭 포함)"
                    >
                      <Required />
                      넥타이 길이
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        id={`tie-length-${index}`}
                        type="number"
                        placeholder="예: 145"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        unit="cm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={control}
                name={`ties.${index}.wearerHeight`}
                rules={{
                  required: "착용자 키를 입력해주세요",
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`wearer-height-${index}`}>
                      <Required />
                      착용자 키
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        id={`wearer-height-${index}`}
                        type="number"
                        placeholder="예: 175"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        unit="cm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          }}
        />
      </div>
      <CloseButton
        onRemove={onRemove}
        className="flex-shrink-0 -mt-2 -mr-2"
        variant="none"
      />
    </CardContent>
  );
};

export default TieItemCard;
