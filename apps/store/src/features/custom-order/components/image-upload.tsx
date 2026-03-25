import { useRef } from "react";
import { Button } from "@/components/ui-extended/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, ImageOff } from "lucide-react";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";

interface ImageUploadProps {
  uploadedImages: ImageUploadHook["uploadedImages"];
  isUploading: ImageUploadHook["isUploading"];
  onFileSelect: ImageUploadHook["uploadFile"];
  onRemoveImage: ImageUploadHook["removeImage"];
}

export const ImageUpload = ({
  uploadedImages,
  isUploading,
  onFileSelect,
  onRemoveImage,
}: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
  };

  return (
    <div>
      <Label className="mb-2 block text-sm font-semibold text-zinc-900">
        참고 이미지
      </Label>
      <div className="space-y-3">
        <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-white p-5 text-center transition-colors">
          <input
            ref={inputRef}
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="sr-only"
          />
          <Label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                <span className="text-sm text-zinc-600">업로드 중...</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-zinc-400" />
                <span className="text-sm text-zinc-600">
                  이미지를 업로드하세요
                </span>
                <span className="text-xs text-zinc-500">
                  PNG, JPG, GIF 파일 지원
                </span>
              </>
            )}
          </Label>
        </div>

        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {uploadedImages.map((image, index) => (
              <div
                key={image.url}
                className="relative rounded-lg border border-zinc-300 bg-white p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-zinc-100">
                    {image.url ? (
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-8 h-8 object-cover"
                      />
                    ) : (
                      <ImageOff className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <span className="text-sm text-zinc-700 truncate">
                    {image.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveImage(index)}
                    className="ml-auto h-6 w-6 flex-shrink-0 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
