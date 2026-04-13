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
import { CheckIcon } from "lucide-react";

interface TieItemCardProps {
  index: number;
  control: Control<ReformOptions>;
  onRemove: () => void;
}

const TieItemCard = ({ index, control, onRemove }: TieItemCardProps) => {
  // 필드를 한 번만 등록 — 모바일/데스크톱 두 레이아웃이 동일한 필드 인스턴스를 공유
  const { trigger } = useFormContext<ReformOptions>();
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
  const { field: dimpleField } = useController({
    control,
    name: `ties.${index}.dimple`,
  });

  const isLengthActive = lengthField.value !== false;
  const isWidthActive = widthField.value === true;

  // ── 재사용 UI 조각 ─────────────────────────────────────────────────

  const mobileImagePickerEl = (
    <ImagePicker
      id={`tie-image-${index}-mobile`}
      selectedFile={
        imageField.value instanceof File ? imageField.value : undefined
      }
      previewUrl={
        typeof imageField.value === "string" ? imageField.value : undefined
      }
      onFileChange={(file) => imageField.onChange(file)}
      onPreviewUrlChange={(url) => imageField.onChange(url ?? undefined)}
    />
  );

  const desktopImagePickerEl = (
    <ImagePicker
      id={`tie-image-${index}-desktop`}
      selectedFile={
        imageField.value instanceof File ? imageField.value : undefined
      }
      previewUrl={
        typeof imageField.value === "string" ? imageField.value : undefined
      }
      onFileChange={(file) => imageField.onChange(file)}
      onPreviewUrlChange={(url) => imageField.onChange(url ?? undefined)}
    />
  );

  const lengthCheckboxEl = (
    <Field orientation="horizontal" className="w-fit cursor-pointer gap-2">
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
          onChange={(e) => lengthField.onChange(e.target.checked)}
        />
        {isLengthActive && <CheckIcon className="size-3 text-white" />}
      </FieldContent>
      <FieldLabel htmlFor={`tie-length-reform-${index}`}>
        <FieldTitle>자동수선</FieldTitle>
      </FieldLabel>
    </Field>
  );

  const desktopDimpleSegmentEl = (
    <span className="ml-auto flex overflow-hidden rounded-md border border-border">
      <DimpleSegment
        value={dimpleField.value ?? false}
        onChange={dimpleField.onChange}
        isActive={false}
      />
    </span>
  );

  const mobileDimpleSegmentEl = (
    <span className="flex overflow-hidden rounded-md border border-border">
      <DimpleSegment
        value={dimpleField.value ?? false}
        onChange={dimpleField.onChange}
        isActive={false}
      />
    </span>
  );

  const widthCheckboxEl = (
    <Field orientation="horizontal" className="w-fit cursor-pointer gap-2">
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
            void trigger(`ties.${index}.hasLengthReform`);
          }}
        />
        {isWidthActive && <CheckIcon className="size-3 text-white" />}
      </FieldContent>
      <FieldLabel htmlFor={`tie-width-reform-${index}`}>
        <FieldTitle>폭수선</FieldTitle>
      </FieldLabel>
    </Field>
  );

  return (
    <div className="py-4">
      {/* 항목 선택 체크박스 + 닫기 버튼 */}
      <div className="flex items-start justify-between gap-3">
        <Field orientation="horizontal" className="items-center gap-3">
          <input
            type="checkbox"
            id={`tie-checked-${index}`}
            checked={checkedField.value || false}
            onChange={checkedField.onChange}
            className="size-4 rounded-[4px] border-input accent-brand-ink"
          />
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

      {/* ── 모바일 레이아웃 (< sm): 자동수선 → 폭수선 세로 배치 ── */}
      <div className="mt-3 grid grid-cols-[107px_minmax(0,1fr)] items-start gap-x-3 sm:hidden">
        {/* 이미지 (레이블 + 피커 함께) */}
        <Field orientation="vertical">
          <FieldLabel htmlFor={`tie-image-${index}-mobile`}>
            <FieldTitle>넥타이 사진</FieldTitle>
          </FieldLabel>
          {mobileImagePickerEl}
        </Field>

        {/* 서비스 영역 — 세로 배치 */}
        <div className="min-w-0 space-y-3">
          {/* 자동수선 블록 */}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              {lengthCheckboxEl}
              {mobileDimpleSegmentEl}
            </div>
            <MeasurementField
              control={control}
              name={`ties.${index}.wearerHeight`}
              label="착용자 키"
              placeholder="예: 175"
              requiredMessage={
                isLengthActive ? "착용자 키를 입력해주세요" : undefined
              }
            />
            <FieldError errors={[lengthFieldState.error]} />
          </div>

          <hr className="border-border" />

          {/* 폭수선 블록 */}
          <div className="space-y-2">
            {widthCheckboxEl}
            <MeasurementField
              control={control}
              name={`ties.${index}.targetWidth`}
              label="원하는 폭"
              placeholder="예: 9"
              requiredMessage={
                isWidthActive ? "원하는 폭을 입력해주세요" : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* ── 데스크톱 레이아웃 (≥ sm): 헤더행 + 입력행 정렬 ── */}
      <div className="mt-3 hidden sm:grid sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-2">
        {/* 행 1: 넥타이 사진 레이블 | 서비스 헤더들 */}
        <FieldLabel htmlFor={`tie-image-${index}-desktop`}>
          <FieldTitle>넥타이 사진</FieldTitle>
        </FieldLabel>
        <div className="grid grid-cols-2 items-center">
          <div className="flex items-center gap-2 border-r border-border pr-3">
            {lengthCheckboxEl}
            {desktopDimpleSegmentEl}
          </div>
          <div className="pl-3">{widthCheckboxEl}</div>
        </div>

        {/* 행 2: 이미지 피커 | 서비스 입력들 */}
        {desktopImagePickerEl}
        <div className="grid grid-cols-2 items-start">
          <div className="border-r border-border pr-3">
            <MeasurementField
              control={control}
              name={`ties.${index}.wearerHeight`}
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
              control={control}
              name={`ties.${index}.targetWidth`}
              label="원하는 폭"
              placeholder="예: 9"
              requiredMessage={
                isWidthActive ? "원하는 폭을 입력해주세요" : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TieItemCard;
