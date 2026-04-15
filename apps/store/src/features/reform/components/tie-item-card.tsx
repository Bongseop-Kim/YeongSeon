import { type Control, useController, useFormContext } from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { type ReformOptions } from "@yeongseon/shared/types/view/reform";
import { ImagePicker } from "@/shared/composite/image-picker";
import CloseButton from "@/shared/ui-extended/close";
import { MeasurementField } from "@/shared/composite/measurement-field";
import { cn } from "@/shared/lib/utils";
import { DimpleSegment } from "@/shared/composite/dimple-segment";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { CheckIcon } from "lucide-react";

interface TieItemCardProps {
  index: number;
  control: Control<ReformOptions>;
  onRemove: () => void;
}

const TieItemCard = ({ index, control, onRemove }: TieItemCardProps) => {
  // 필드를 한 번만 등록 — 모바일/데스크톱 두 레이아웃이 동일한 필드 인스턴스를 공유
  const { isMobile } = useBreakpoint();
  const { clearErrors } = useFormContext<ReformOptions>();
  const { field: checkedField } = useController({
    control,
    name: `ties.${index}.checked`,
  });
  const { field: imageField } = useController({
    control,
    name: `ties.${index}.image`,
  });
  const { field: lengthField, fieldState: lengthFieldState } = useController({
    control,
    name: `ties.${index}.hasLengthReform`,
    rules: {
      validate: (_, formValues) => {
        if (!formValues || !Array.isArray(formValues.ties)) {
          return "수선 서비스를 하나 이상 선택해주세요.";
        }

        const tie = formValues.ties[index];

        if (!tie) {
          return "수선 서비스를 하나 이상 선택해주세요.";
        }

        return (
          tie.hasLengthReform !== false ||
          tie.hasWidthReform === true ||
          "수선 서비스를 하나 이상 선택해주세요."
        );
      },
    },
  });
  const { field: widthField } = useController({
    control,
    name: `ties.${index}.hasWidthReform`,
  });
  const { field: wearerHeightField, fieldState: wearerHeightFieldState } =
    useController({
      control,
      name: `ties.${index}.wearerHeight`,
      rules: {
        validate: (value, formValues) => {
          const tie = formValues?.ties?.[index];
          const isActive = tie ? tie.hasLengthReform !== false : false;
          if (!isActive) return true;
          if (value == null) {
            return "착용자 키를 입력해주세요";
          }
          return Number.isFinite(value as number) && (value as number) > 0
            ? true
            : "0보다 큰 숫자를 입력해주세요.";
        },
      },
    });
  const { field: targetWidthField, fieldState: targetWidthFieldState } =
    useController({
      control,
      name: `ties.${index}.targetWidth`,
      rules: {
        validate: (value, formValues) => {
          const tie = formValues?.ties?.[index];
          const isActive = tie ? tie.hasWidthReform === true : false;
          if (!isActive) return true;
          if (value == null) {
            return "원하는 폭을 입력해주세요";
          }
          return Number.isFinite(value as number) && (value as number) > 0
            ? true
            : "0보다 큰 숫자를 입력해주세요.";
        },
      },
    });
  const { field: dimpleField } = useController({
    control,
    name: `ties.${index}.dimple`,
  });

  const isLengthActive = lengthField.value !== false;
  const isWidthActive = widthField.value === true;

  return (
    <div className="py-4">
      {/* 항목 선택 체크박스 + 닫기 버튼 */}
      <div className="flex items-start justify-between gap-3">
        <Field orientation="horizontal" className="items-center gap-3">
          <FieldContent
            className={cn(
              "flex-none size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
              checkedField.value
                ? "border-brand-ink bg-brand-ink"
                : "border-input bg-white",
            )}
          >
            <input
              type="checkbox"
              id={`tie-checked-${index}`}
              className="sr-only"
              checked={checkedField.value || false}
              onChange={checkedField.onChange}
            />
            {checkedField.value && <CheckIcon className="size-3 text-white" />}
          </FieldContent>
          <FieldLabel htmlFor={`tie-checked-${index}`}>
            <FieldTitle>항목 {index + 1}</FieldTitle>
          </FieldLabel>
        </Field>
        <CloseButton
          onRemove={onRemove}
          className="-mr-2 -mt-1"
          variant="none"
        />
      </div>

      {isMobile ? (
        <div className="mt-3 grid grid-cols-[107px_minmax(0,1fr)] items-start gap-x-3">
          <Field orientation="vertical">
            <FieldLabel htmlFor={`tie-image-${index}-mobile`}>
              <FieldTitle>넥타이 사진</FieldTitle>
            </FieldLabel>
            <ImagePicker
              id={`tie-image-${index}-mobile`}
              selectedFile={
                imageField.value instanceof File ? imageField.value : undefined
              }
              previewUrl={
                typeof imageField.value === "string"
                  ? imageField.value
                  : undefined
              }
              onFileChange={(file) => imageField.onChange(file)}
              onPreviewUrlChange={(url) =>
                imageField.onChange(url ?? undefined)
              }
            />
          </Field>

          <div className="min-w-0 space-y-3">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <Field
                  orientation="horizontal"
                  className="w-fit cursor-pointer gap-2"
                >
                  <FieldContent
                    className={cn(
                      "flex-none size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                      isLengthActive
                        ? "border-brand-ink bg-brand-ink"
                        : "border-input bg-white",
                    )}
                  >
                    <input
                      type="checkbox"
                      id={`tie-length-reform-${index}`}
                      className="sr-only"
                      checked={isLengthActive}
                      onChange={(e) => {
                        lengthField.onChange(e.target.checked);
                        clearErrors(`ties.${index}.hasLengthReform`);
                        if (!e.target.checked) {
                          clearErrors(`ties.${index}.wearerHeight`);
                        }
                      }}
                    />
                    {isLengthActive && (
                      <CheckIcon className="size-3 text-white" />
                    )}
                  </FieldContent>
                  <FieldLabel htmlFor={`tie-length-reform-${index}`}>
                    <FieldTitle>자동수선</FieldTitle>
                  </FieldLabel>
                </Field>
                <DimpleSegment
                  value={dimpleField.value ?? false}
                  onChange={dimpleField.onChange}
                  disabled={!isLengthActive}
                />
              </div>
              <MeasurementField
                field={wearerHeightField}
                fieldState={wearerHeightFieldState}
                label="착용자 키"
                placeholder="예: 175"
                requiredMessage={
                  isLengthActive ? "착용자 키를 입력해주세요" : undefined
                }
              />
              <FieldError errors={[lengthFieldState.error]} />
            </div>

            <hr className="border-border" />

            <div className="space-y-2">
              <Field
                orientation="horizontal"
                className="w-fit cursor-pointer gap-2"
              >
                <FieldContent
                  className={cn(
                    "flex-none size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                    isWidthActive
                      ? "border-brand-ink bg-brand-ink"
                      : "border-input bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    id={`tie-width-reform-${index}`}
                    className="sr-only"
                    checked={isWidthActive}
                    onChange={(e) => {
                      widthField.onChange(e.target.checked);
                      clearErrors(`ties.${index}.hasLengthReform`);
                      if (!e.target.checked) {
                        clearErrors(`ties.${index}.targetWidth`);
                      }
                    }}
                  />
                  {isWidthActive && <CheckIcon className="size-3 text-white" />}
                </FieldContent>
                <FieldLabel htmlFor={`tie-width-reform-${index}`}>
                  <FieldTitle>폭수선</FieldTitle>
                </FieldLabel>
              </Field>
              <MeasurementField
                field={targetWidthField}
                fieldState={targetWidthFieldState}
                label="원하는 폭"
                placeholder="예: 9"
                requiredMessage={
                  isWidthActive ? "원하는 폭을 입력해주세요" : undefined
                }
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 gap-y-2">
          <FieldLabel htmlFor={`tie-image-${index}-desktop`}>
            <FieldTitle>넥타이 사진</FieldTitle>
          </FieldLabel>
          <div className="grid grid-cols-2 items-center">
            <div className="flex items-center justify-between border-r border-border pr-3">
              <Field
                orientation="horizontal"
                className="w-fit cursor-pointer gap-2"
              >
                <FieldContent
                  className={cn(
                    "flex-none size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                    isLengthActive
                      ? "border-brand-ink bg-brand-ink"
                      : "border-input bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    id={`tie-length-reform-${index}`}
                    className="sr-only"
                    checked={isLengthActive}
                    onChange={(e) => {
                      lengthField.onChange(e.target.checked);
                      clearErrors(`ties.${index}.hasLengthReform`);
                      if (!e.target.checked) {
                        clearErrors(`ties.${index}.wearerHeight`);
                      }
                    }}
                  />
                  {isLengthActive && (
                    <CheckIcon className="size-3 text-white" />
                  )}
                </FieldContent>
                <FieldLabel htmlFor={`tie-length-reform-${index}`}>
                  <FieldTitle>자동수선</FieldTitle>
                </FieldLabel>
              </Field>
              <DimpleSegment
                value={dimpleField.value ?? false}
                onChange={dimpleField.onChange}
                disabled={!isLengthActive}
              />
            </div>
            <div className="pl-3">
              <Field
                orientation="horizontal"
                className="w-fit cursor-pointer gap-2"
              >
                <FieldContent
                  className={cn(
                    "flex-none size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                    isWidthActive
                      ? "border-brand-ink bg-brand-ink"
                      : "border-input bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    id={`tie-width-reform-${index}`}
                    className="sr-only"
                    checked={isWidthActive}
                    onChange={(e) => {
                      widthField.onChange(e.target.checked);
                      clearErrors(`ties.${index}.hasLengthReform`);
                      if (!e.target.checked) {
                        clearErrors(`ties.${index}.targetWidth`);
                      }
                    }}
                  />
                  {isWidthActive && <CheckIcon className="size-3 text-white" />}
                </FieldContent>
                <FieldLabel htmlFor={`tie-width-reform-${index}`}>
                  <FieldTitle>폭수선</FieldTitle>
                </FieldLabel>
              </Field>
            </div>
          </div>

          <ImagePicker
            id={`tie-image-${index}-desktop`}
            selectedFile={
              imageField.value instanceof File ? imageField.value : undefined
            }
            previewUrl={
              typeof imageField.value === "string"
                ? imageField.value
                : undefined
            }
            onFileChange={(file) => imageField.onChange(file)}
            onPreviewUrlChange={(url) => imageField.onChange(url ?? undefined)}
          />
          <div className="grid grid-cols-2 items-start">
            <div className="border-r border-border pr-3">
              <MeasurementField
                field={wearerHeightField}
                fieldState={wearerHeightFieldState}
                label="착용자 키"
                placeholder="예: 175"
                requiredMessage={
                  isLengthActive ? "착용자 키를 입력해주세요" : undefined
                }
              />
              <FieldError errors={[lengthFieldState.error]} />
            </div>
            <div className="pl-3">
              <MeasurementField
                field={targetWidthField}
                fieldState={targetWidthFieldState}
                label="원하는 폭"
                placeholder="예: 9"
                requiredMessage={
                  isWidthActive ? "원하는 폭을 입력해주세요" : undefined
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TieItemCard;
