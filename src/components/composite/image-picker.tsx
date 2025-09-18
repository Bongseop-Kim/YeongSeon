import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  selectedFile?: File;
  selectedFiles?: File[];
  onFileChange?: (file: File | undefined) => void;
  onFilesChange?: (files: File[]) => void;
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
      onFileChange,
      onFilesChange,
      multi = false,
      maxFiles = 5,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

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
      if (multi && onFilesChange && index !== undefined) {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        onFilesChange(newFiles);
      } else if (!multi && onFileChange) {
        onFileChange(undefined);
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const currentCount = multi ? selectedFiles.length : selectedFile ? 1 : 0;
    const canAddMore = multi ? currentCount < maxFiles : !selectedFile;

    return (
      <div className={cn("relative", className)}>
        {multi ? (
          <div className="flex gap-2 items-start">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative border border-dashed border-gray-300 p-1 w-[107px] h-[129px]"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`업로드된 이미지 ${index + 1}`}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 hover:bg-gray-100 shadow-sm"
                  onClick={() => handleRemove(index)}
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
                    className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
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
              selectedFile
                ? "bg-stone-50"
                : "border border-dashed border-gray-300"
            )}
          >
            {selectedFile ? (
              <>
                <img
                  src={URL.createObjectURL(selectedFile)}
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
          ref={ref || inputRef}
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
