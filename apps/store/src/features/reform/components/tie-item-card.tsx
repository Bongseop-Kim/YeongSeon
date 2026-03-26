import { useId } from "react";
import { type Control, Controller } from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui-extended/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const tieLengthId = useId();
  const wearerHeightId = useId();

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

      <div className="mt-3 grid gap-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
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
          <Controller
            control={control}
            name={`ties.${index}.measurementType`}
            render={({ field }) => (
              <Field orientation="vertical">
                <FieldLabel>
                  <FieldTitle>측정 방식</FieldTitle>
                </FieldLabel>
                <FieldContent>
                  <RadioGroup
                    value={field.value || "length"}
                    onValueChange={(value) => {
                      field.onChange(
                        isMeasurementType(value) ? value : "length",
                      );
                    }}
                    className="gap-2"
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
                  </RadioGroup>
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            control={control}
            name={`ties.${index}.measurementType`}
            render={({ field: measurementField }) => {
              const currentMeasurementType = measurementField.value || "length";

              return currentMeasurementType === "length" ? (
                <MeasurementInputField
                  control={control}
                  name={`ties.${index}.tieLength`}
                  id={tieLengthId}
                  label="넥타이 길이"
                  description="(매듭 포함)"
                  placeholder="예: 51"
                  requiredMessage="넥타이 길이를 입력해주세요"
                />
              ) : (
                <MeasurementInputField
                  control={control}
                  name={`ties.${index}.wearerHeight`}
                  id={wearerHeightId}
                  label="착용자 키"
                  placeholder="예: 175"
                  requiredMessage="착용자 키를 입력해주세요"
                />
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface MeasurementInputFieldProps {
  control: Control<ReformOptions>;
  name: `ties.${number}.tieLength` | `ties.${number}.wearerHeight`;
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  requiredMessage: string;
}

const MeasurementInputField = ({
  control,
  name,
  id,
  label,
  description,
  placeholder,
  requiredMessage,
}: MeasurementInputFieldProps) => {
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: requiredMessage }}
      render={({ field, fieldState }) => (
        <Field orientation="vertical">
          <FieldLabel htmlFor={id}>
            <FieldTitle>
              <Required />
              {label}
            </FieldTitle>
          </FieldLabel>
          {description && (
            <FieldDescription className="-mt-1 text-xs">
              {description}
            </FieldDescription>
          )}
          <FieldContent>
            <Input
              {...field}
              id={id}
              type="number"
              placeholder={placeholder}
              value={field.value || ""}
              onChange={(e) =>
                field.onChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              unit="cm"
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? errorId : undefined}
            />
            <FieldError id={errorId} errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  );
};

export default TieItemCard;
