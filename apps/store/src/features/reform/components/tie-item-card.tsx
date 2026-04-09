import { type Control, Controller, useWatch } from "react-hook-form";
import { Field, FieldError, FieldLabel, FieldTitle } from "@/shared/ui/field";
import { type ReformOptions } from "@yeongseon/shared/types/view/reform";
import { ImagePicker } from "@/shared/composite/image-picker";
import CloseButton from "@/shared/ui-extended/close";
import { MeasurementField } from "@/shared/composite/measurement-field";
import { cn } from "@/shared/lib/utils";
import { CheckIcon } from "lucide-react";

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
      {/* 헤더: 항목 선택 체크박스 + 닫기 버튼 */}
      <div className="flex items-start justify-between gap-3">
        <Controller
          control={control}
          name={`ties.${index}.checked`}
          render={({ field }) => (
            <Field orientation="horizontal" className="items-center gap-3">
              <input
                type="checkbox"
                id={`tie-checked-${index}`}
                checked={field.value || false}
                onChange={field.onChange}
                className="size-4 rounded-[4px] border-input accent-brand-ink"
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

      {/* 바디: 이미지 + 서비스 영역 */}
      {/*
        데스크톱: grid-cols-[104px_1fr] — 이미지(104px) | 서비스 2열
        모바일:   grid-cols-[88px_1fr]  — 이미지(88px) | 서비스 1열
      */}
      <div className="mt-3 grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-4">
        {/* 이미지 피커 */}
        <Controller
          control={control}
          name={`ties.${index}.image`}
          render={({ field }) => (
            <Field orientation="vertical">
              <FieldLabel>
                <FieldTitle>넥타이 사진</FieldTitle>
              </FieldLabel>
              <ImagePicker
                id={`tie-image-${index}`}
                selectedFile={
                  field.value instanceof File ? field.value : undefined
                }
                previewUrl={
                  typeof field.value === "string" ? field.value : undefined
                }
                onFileChange={(file) => field.onChange(file)}
                onPreviewUrlChange={(url) => field.onChange(url ?? undefined)}
              />
            </Field>
          )}
        />

        {/* 수선 서비스 영역 */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* ── 자동수선 카드 ── */}
            <Controller
              control={control}
              name={`ties.${index}.hasLengthReform`}
              rules={{
                validate: (_, formValues) => {
                  const tie = formValues.ties[index];
                  return (
                    tie.hasLengthReform !== false ||
                    tie.hasWidthReform === true ||
                    "수선 서비스를 하나 이상 선택해주세요."
                  );
                },
              }}
              render={({ field, fieldState }) => (
                <div>
                  <div
                    className={cn(
                      "overflow-hidden rounded-md border transition-colors",
                      isLengthActive ? "border-brand-ink" : "border-border",
                    )}
                  >
                    {/* 트리거 행 */}
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-[10px] transition-colors",
                        isLengthActive
                          ? "bg-brand-ink"
                          : "bg-muted hover:bg-brand-paper-muted",
                      )}
                    >
                      {/* 비주얼 체크박스 */}
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                          isLengthActive
                            ? "border-white"
                            : "border-input bg-white",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isLengthActive}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        {isLengthActive && (
                          <CheckIcon className="size-3 text-white" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isLengthActive ? "text-white" : "text-foreground",
                        )}
                      >
                        자동수선
                      </span>
                    </label>

                    {/* 패널: 측정값 입력 */}
                    <div className="border-t border-border p-3">
                      <Controller
                        control={control}
                        name={`ties.${index}.measurementType`}
                        render={({ field: segField }) => (
                          <div className="mb-3 flex overflow-hidden rounded-md border border-border bg-muted/40">
                            {(["length", "height"] as const).map((type, i) => (
                              <button
                                key={type}
                                type="button"
                                className={cn(
                                  "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                                  i > 0 && "border-l border-border",
                                  (segField.value ?? "length") === type
                                    ? "bg-brand-ink text-white"
                                    : "text-muted-foreground hover:bg-background",
                                )}
                                onClick={() => segField.onChange(type)}
                              >
                                {type === "length"
                                  ? "넥타이 길이"
                                  : "착용자 키"}
                              </button>
                            ))}
                          </div>
                        )}
                      />
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
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </div>
              )}
            />

            {/* ── 폭수선 카드 ── */}
            <Controller
              control={control}
              name={`ties.${index}.hasWidthReform`}
              render={({ field }) => (
                <div
                  className={cn(
                    "overflow-hidden rounded-md border transition-colors",
                    isWidthActive ? "border-brand-ink" : "border-border",
                  )}
                >
                  {/* 트리거 행 */}
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-[10px] transition-colors",
                      isWidthActive
                        ? "bg-brand-ink"
                        : "bg-muted hover:bg-brand-paper-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                        isWidthActive
                          ? "border-white"
                          : "border-input bg-white",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isWidthActive}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      {isWidthActive && (
                        <CheckIcon className="size-3 text-white" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isWidthActive ? "text-white" : "text-foreground",
                      )}
                    >
                      폭수선
                    </span>
                  </label>

                  {/* 패널: 폭 입력 */}
                  <div className="border-t border-border p-3">
                    <MeasurementField
                      control={control}
                      name={`ties.${index}.targetWidth`}
                      label="원하는 폭"
                      placeholder="예: 9"
                      requiredMessage="원하는 폭을 입력해주세요"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TieItemCard;
