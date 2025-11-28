import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { useImageUpload } from "../hooks/useImageUpload";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { OrderOptions } from "../types/order";

interface ImageUploadProps {
  setValue: UseFormSetValue<OrderOptions>;
  watch: UseFormWatch<OrderOptions>;
}

export const ImageUpload = ({ setValue, watch }: ImageUploadProps) => {
  const { selectedImages, handleImageUpload, removeImage } = useImageUpload({
    setValue,
    watch,
  });

  return (
    <div>
      <Label className="text-sm font-medium text-zinc-900 mb-2 block">
        참고 이미지
      </Label>
      <div className="space-y-3">
        <div className="border-2 border-dashed border-stone-200 rounded-md p-6 text-center transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <Label
            htmlFor="image-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-zinc-400" />
            <span className="text-sm text-zinc-600">이미지를 업로드하세요</span>
            <span className="text-xs text-zinc-500">
              PNG, JPG, GIF 파일 지원
            </span>
          </Label>
        </div>

        {selectedImages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {selectedImages.map((image, index) => (
              <div
                key={index}
                className="relative border border-stone-200 rounded-lg p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-100 rounded flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-zinc-600" />
                  </div>
                  <span className="text-sm text-zinc-700 truncate">
                    {image.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(index)}
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
