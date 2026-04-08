import { type Control, Controller, useWatch } from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { RadioGroupItem } from "@/shared/ui/radio-group";
import { type ReformOptions } from "@yeongseon/shared/types/view/reform";
import { ImagePicker } from "@/shared/composite/image-picker";
import { Checkbox } from "@/shared/ui/checkbox";
import CloseButton from "@/shared/ui-extended/close";
import { RadioGroupField } from "@/shared/composite/radio-group-field";
import { MeasurementField } from "@/shared/composite/measurement-field";

interface TieItemCardProps {
  index: number;
  control: Control<ReformOptions>;
  onRemove: () => void;
}

const TieItemCard = ({ index, control, onRemove }: TieItemCardProps) => {
  const [currentMeasurementType, hasLengthReform, hasWidthReform] = useWatch({
    control,
    name: [
      `ties.${index}.measurementType`,
      `ties.${index}.hasLengthReform`,
      `ties.${index}.hasWidthReform`,
    ],
  });

  const isLengthActive = hasLengthReform !== false;
  const isWidthActive = hasWidthReform === true;

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-3">
        <Controller
          control={control}
          name={`ties.${index}.checked`}
          render={({ field }) => (
            <Field orientation="horizontal" className="gap-3 items-center">
              <Checkbox
                id={`tie-checked-${index}`}
                checked={field.value || false}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor={`tie-checked-${index}`}>
                <FieldTitle>항목 {index + 1}</FieldTitle>
              </FieldLabel>
            </Field>
          )}
        />

        <CloseButton
          onRemove={onRemove}
          className="-mr-2 -mt-1"
          variant="none"
        />
      </div>

      <div className="mt-3 grid grid-cols-[107px_minmax(0,1fr)] items-start gap-4">
        <Controller
          control={control}
          name={`ties.${index}.image`}
          render={({ field }) => (
            <Field orientation="vertical">
              <FieldLabel>
                <FieldTitle>넥타이 사진</FieldTitle>
              </FieldLabel>
              <FieldDescription className="-mt-1 text-xs">
                (선택사항)
              </FieldDescription>
              <FieldContent>
                <ImagePicker
                  id={`tie-image-${index}`}
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
              </FieldContent>
            </Field>
          )}
        />

        <div className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>
              <FieldTitle>수선 서비스</FieldTitle>
            </FieldLabel>
            <FieldDescription className="-mt-1 text-xs">
              하나 이상 선택해주세요.
            </FieldDescription>

            <FieldContent className="space-y-4">
              <Controller
                control={control}
                name={`ties.${index}.hasLengthReform`}
                rules={{
                  validate: (_, formValues) => {
                    const tie = formValues.ties[index];
                    const hasLength = tie.hasLengthReform !== false;
                    const hasWidth = tie.hasWidthReform === true;

                    return (
                      hasLength ||
                      hasWidth ||
                      "수선 서비스를 하나 이상 선택해주세요."
                    );
                  },
                }}
                render={({ field, fieldState }) => (
                  <div className="space-y-3">
                    <Field
                      orientation="horizontal"
                      className="gap-3 items-center"
                    >
                      <Checkbox
                        id={`length-reform-${index}`}
                        checked={field.value !== false}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      <FieldLabel htmlFor={`length-reform-${index}`}>
                        <FieldTitle>자동수선</FieldTitle>
                      </FieldLabel>
                    </Field>
                    <FieldError errors={[fieldState.error]} />
                  </div>
                )}
              />

              {isLengthActive && (
                <div className="ml-7 space-y-4">
                  <RadioGroupField
                    control={control}
                    name={`ties.${index}.measurementType`}
                    label="측정 방식"
                    radioGroupClassName="gap-2"
                  >
                    <Field orientation="horizontal">
                      <RadioGroupItem
                        value="length"
                        id={`measurement-${index}-length`}
                      />
                      <FieldLabel htmlFor={`measurement-${index}-length`}>
                        <FieldTitle>넥타이 길이</FieldTitle>
                      </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                      <RadioGroupItem
                        value="height"
                        id={`measurement-${index}-height`}
                      />
                      <FieldLabel htmlFor={`measurement-${index}-height`}>
                        <FieldTitle>착용자 키</FieldTitle>
                      </FieldLabel>
                    </Field>
                  </RadioGroupField>

                  {(currentMeasurementType ?? "length") === "length" ? (
                    <MeasurementField
                      control={control}
                      name={`ties.${index}.tieLength`}
                      label="넥타이 길이"
                      description="(매듭 포함)"
                      placeholder="예: 51"
                      requiredMessage="넥타이 길이를 입력해주세요"
                    />
                  ) : (
                    <MeasurementField
                      control={control}
                      name={`ties.${index}.wearerHeight`}
                      label="착용자 키"
                      placeholder="예: 175"
                      requiredMessage="착용자 키를 입력해주세요"
                    />
                  )}
                </div>
              )}

              <Controller
                control={control}
                name={`ties.${index}.hasWidthReform`}
                render={({ field }) => (
                  <Field
                    orientation="horizontal"
                    className="gap-3 items-center"
                  >
                    <Checkbox
                      id={`width-reform-${index}`}
                      checked={field.value === true}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <FieldLabel htmlFor={`width-reform-${index}`}>
                      <FieldTitle>폭수선</FieldTitle>
                    </FieldLabel>
                  </Field>
                )}
              />

              {isWidthActive && (
                <div className="ml-7">
                  <MeasurementField
                    control={control}
                    name={`ties.${index}.targetWidth`}
                    label="원하는 폭"
                    placeholder="예: 9"
                    requiredMessage="원하는 폭을 입력해주세요"
                  />
                </div>
              )}
            </FieldContent>
          </Field>
        </div>
      </div>
    </div>
  );
};

export default TieItemCard;
