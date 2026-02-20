import { useRef } from "react";
import { IKUpload } from "@imagekit/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import type { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";

type ImageUploadHook = ReturnType<typeof useImageUpload>;

interface ImageUploadProps {
  uploadedImages: ImageUploadHook["uploadedImages"];
  isUploading: ImageUploadHook["isUploading"];
  authenticator: ImageUploadHook["authenticator"];
  onUploadSuccess: ImageUploadHook["handleUploadSuccess"];
  onUploadStart: ImageUploadHook["handleUploadStart"];
  onUploadError: ImageUploadHook["handleUploadError"];
  onRemoveImage: ImageUploadHook["removeImage"];
}

export const ImageUpload = ({
  uploadedImages,
  isUploading,
  authenticator,
  onUploadSuccess,
  onUploadStart,
  onUploadError,
  onRemoveImage,
}: ImageUploadProps) => {
  const uploadRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <Label className="text-sm font-medium text-zinc-900 mb-2 block">
        참고 이미지
      </Label>
      <div className="space-y-3">
        <div className="border-2 border-dashed border-stone-200 rounded-sm p-6 text-center transition-colors">
          <IKUpload
            ref={uploadRef}
            folder="/custom-orders"
            authenticator={authenticator}
            onUploadStart={onUploadStart}
            onSuccess={onUploadSuccess}
            onError={onUploadError}
            accept="image/*"
            style={{ display: "none" }}
          />
          <Label
            onClick={() => uploadRef.current?.click()}
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
                <span className="text-sm text-zinc-600">
                  업로드 중...
                </span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-zinc-400" />
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
                className="relative border border-stone-200 rounded-lg p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-8 h-8 object-cover"
                    />
                  </div>
                  <span className="text-sm text-zinc-700 truncate">
                    {image.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveImage(index)}
                    className="h-6 w-6 p-0 ml-auto flex-shrink-0"
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
