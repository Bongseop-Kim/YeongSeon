import { useId, useRef } from "react";
import { X, Loader2, Plus } from "lucide-react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";
import { cn } from "@/shared/lib/utils";

interface ImageUploadProps {
  uploadedImages: ImageUploadHook["uploadedImages"];
  isUploading: ImageUploadHook["isUploading"];
  onFileSelect: ImageUploadHook["uploadFile"];
  onRemoveImage: ImageUploadHook["removeImage"];
  showHeader?: boolean;
}

export const ImageUpload = ({
  uploadedImages,
  isUploading,
  onFileSelect,
  onRemoveImage,
  showHeader = true,
}: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
  };

  return (
    <Field orientation="vertical">
      {showHeader ? (
        <>
          <FieldLabel>
            <FieldTitle>참고 이미지</FieldTitle>
          </FieldLabel>
          <FieldDescription>PNG, JPG, GIF 파일 지원</FieldDescription>
        </>
      ) : null}
      <FieldContent>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {uploadedImages.map((image, index) => (
            <div
              key={`${image.fileId}-${image.url}-${index}`}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${image.name} 미리보기 없음`}
                  className="h-full w-full bg-[repeating-linear-gradient(45deg,var(--color-muted)_0,var(--color-muted)_8px,var(--color-border)_8px,var(--color-border)_16px)]"
                />
              )}
              <button
                type="button"
                aria-label={`${image.name} 삭제`}
                onClick={() => onRemoveImage(index)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background transition-colors hover:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <label
            htmlFor={inputId}
            aria-label="이미지 추가"
            className={cn(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background text-foreground transition-colors hover:bg-muted",
              isUploading && "cursor-wait text-foreground-muted",
            )}
          >
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              aria-label="이미지 파일 선택"
              accept="image/*"
              onChange={handleChange}
              disabled={isUploading}
              className="sr-only"
            />
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">업로드 중...</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span className="text-xs">추가</span>
              </>
            )}
          </label>
        </div>
      </FieldContent>
    </Field>
  );
};
