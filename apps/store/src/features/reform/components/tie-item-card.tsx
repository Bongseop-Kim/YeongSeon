import { type Control } from "react-hook-form";
import { Input } from "@/components/ui-extended/input";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  isMeasurementType,
  type ReformOptions,
} from "@yeongseon/shared/types/view/reform";
import { ImagePicker } from "@/components/composite/image-picker";
import { Checkbox } from "@/components/ui/checkbox";
import CloseButton from "@/components/ui-extended/close";
import { Required } from "@/components/ui/required";

interface TieItemCardProps {
  index: number;
  control: Control<ReformOptions>;
  onRemove: () => void;
}

const TieItemCard = ({ index, control, onRemove }: TieItemCardProps) => {
  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-3">
        <FormField
          control={control}
          name={`ties.${index}.checked`}
          render={({ field }) => (
            <label className="flex items-center gap-3 text-sm font-medium text-zinc-900">
              <Checkbox
                checked={field.value || false}
                onCheckedChange={field.onChange}
              />
              <span>항목 {index + 1}</span>
            </label>
          )}
        />

        <CloseButton
          onRemove={onRemove}
          className="-mr-2 -mt-1"
          variant="none"
        />
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
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
                  previewUrl={
                    typeof field.value === "string" ? field.value : undefined
                  }
                  onFileChange={(file) => {
                    field.onChange(file);
                  }}
                  onPreviewUrlChange={(url) => {
                    field.onChange(url ?? undefined);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
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
                      field.onChange(
                        isMeasurementType(value) ? value : "length",
                      );
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
                          placeholder="예: 51"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
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
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
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
      </div>
    </div>
  );
};

export default TieItemCard;
