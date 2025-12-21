import * as React from "react";
import { X } from "lucide-react";
import { cn, mergeRefs } from "@/lib/utils";

interface ImagePickerProps {
  selectedFile?: File;
  selectedFiles?: File[];
  previewUrl?: string; // 문자열 URL (DB에서 복원된 이미지 등)
  previewUrls?: string[]; // 다중 선택 모드에서 사용할 문자열 URL 배열
  onFileChange?: (file: File | undefined) => void;
  onFilesChange?: (files: File[]) => void;
  onPreviewUrlChange?: (url: string | undefined) => void; // 단일 선택 모드에서 previewUrl 변경
  onPreviewUrlsChange?: (urls: string[]) => void; // 다중 선택 모드에서 previewUrls 변경
  multi?: boolean;
  maxFiles?: number;
  className?: string;
  id?: string;
}

export const ImagePicker = React.forwardRef<HTMLInputElement, ImagePickerProps>(
  (
    {
      selectedFile,
      selectedFiles = [],
      previewUrl,
      previewUrls = [],
      onFileChange,
      onFilesChange,
      onPreviewUrlChange,
      onPreviewUrlsChange,
      multi = false,
      maxFiles = 5,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const mergedRef = mergeRefs(ref, inputRef);

    // URL.createObjectURL 메모리 누수 방지
    const singleFileUrl = React.useMemo(() => {
      if (selectedFile) {
        return URL.createObjectURL(selectedFile);
      }
      return null;
    }, [selectedFile]);

    const multiFileUrls = React.useMemo(() => {
      return selectedFiles.map((file) => URL.createObjectURL(file));
    }, [selectedFiles]);

    // cleanup: URL.revokeObjectURL
    React.useEffect(() => {
      return () => {
        if (singleFileUrl) {
          URL.revokeObjectURL(singleFileUrl);
        }
        multiFileUrls.forEach((url) => {
          URL.revokeObjectURL(url);
        });
      };
    }, [singleFileUrl, multiFileUrls]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (multi && onFilesChange) {
        const newFiles = [...selectedFiles, ...files].slice(0, maxFiles);
        onFilesChange(newFiles);
      } else if (!multi && onFileChange) {
        const file = files[0];
        onFileChange(file);
      }
    };

    const handleRemove = (index?: number) => {
      if (multi) {
        if (index !== undefined) {
          // previewUrls 범위인지 확인
          if (index < previewUrls.length) {
            // previewUrl 제거
            if (onPreviewUrlsChange) {
              const newUrls = previewUrls.filter((_, i) => i !== index);
              onPreviewUrlsChange(newUrls);
            }
          } else {
            // selectedFile 제거
            if (onFilesChange) {
              const fileIndex = index - previewUrls.length;
              const newFiles = selectedFiles.filter((_, i) => i !== fileIndex);
              onFilesChange(newFiles);
            }
          }
        }
      } else {
        // 단일 선택 모드: previewUrl이 있으면 먼저 제거, 없으면 selectedFile 제거
        if (previewUrl && onPreviewUrlChange) {
          onPreviewUrlChange(undefined);
        } else if (onFileChange) {
          onFileChange(undefined);
        }
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    // previewUrl이 있으면 File보다 우선 사용
    const hasPreview = multi
      ? previewUrls.length > 0 || selectedFiles.length > 0
      : previewUrl || selectedFile;

    const currentCount = multi
      ? previewUrls.length + selectedFiles.length
      : previewUrl || selectedFile
      ? 1
      : 0;
    const canAddMore = multi ? currentCount < maxFiles : !hasPreview;

    return (
      <div className={cn("relative", className)}>
        {multi ? (
          <div className="flex gap-2 items-start">
            {/* previewUrls 표시 (DB에서 복원된 이미지) */}
            {previewUrls.map((url, index) => (
              <div
                key={`preview-${index}`}
                className="relative border border-dashed border-gray-300 p-1 w-[107px] h-[129px]"
              >
                <img
                  src={url}
                  alt={`업로드된 이미지 ${index + 1}`}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm"
                  onClick={() => handleRemove(index)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {/* selectedFiles 표시 (새로 업로드된 파일) */}
            {selectedFiles.map((_, index) => (
              <div
                key={`file-${index}`}
                className="relative border border-dashed border-gray-300 p-1 w-[107px] h-[129px]"
              >
                <img
                  src={multiFileUrls[index]}
                  alt={`업로드된 이미지 ${previewUrls.length + index + 1}`}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm"
                  onClick={() => handleRemove(previewUrls.length + index)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {canAddMore && (
              <div className="flex flex-col items-center">
                <div className="relative border border-dashed border-gray-300 p-1 w-[107px] h-[129px]">
                  <label
                    htmlFor={id || "image-picker"}
                    className="w-full h-full flex items-center justify-center cursor-pointer"
                  >
                    +
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ({currentCount}/{maxFiles})
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "relative  w-[107px] h-[129px]",
              previewUrl || selectedFile
                ? "bg-zinc-50"
                : "border border-dashed border-gray-300"
            )}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="업로드된 이미지"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-black rounded-full w-4 h-4 flex items-center justify-center"
                  onClick={() => handleRemove()}
                >
                  <X className="size-3" color="white" />
                </button>
              </>
            ) : selectedFile && singleFileUrl ? (
              <>
                <img
                  src={singleFileUrl}
                  alt="업로드된 이미지"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-black rounded-full w-4 h-4 flex items-center justify-center"
                  onClick={() => handleRemove()}
                >
                  <X className="size-3" color="white" />
                </button>
              </>
            ) : (
              <label
                htmlFor={id || "image-picker"}
                className="w-full h-full flex items-center justify-center cursor-pointer "
              >
                +
              </label>
            )}
          </div>
        )}

        <input
          ref={mergedRef}
          type="file"
          accept="image/*"
          multiple={multi}
          onChange={handleFileChange}
          className="hidden"
          id={id || "image-picker"}
          {...props}
        />
      </div>
    );
  }
);

ImagePicker.displayName = "ImagePicker";
