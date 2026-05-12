import { Controller, useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { Textarea } from "@/shared/ui/textarea";
import { ImageUpload } from "@/features/custom-order/components/image-upload";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";

interface AttachmentStepProps {
  imageUpload: ImageUploadHook;
  pickerSlot?: React.ReactNode;
}

export const AttachmentStep = ({
  imageUpload,
  pickerSlot,
}: AttachmentStepProps) => {
  const { control } = useFormContext<QuoteOrderOptions>();

  return (
    <div className="space-y-6">
      <UtilityPagePanel title="참고 이미지">
        <div className="space-y-2.5">
          <ImageUpload
            uploadedImages={imageUpload.uploadedImages}
            isUploading={imageUpload.isUploading}
            onFileSelect={imageUpload.uploadFile}
            onRemoveImage={imageUpload.removeImage}
            showHeader={false}
          />
          {pickerSlot}
        </div>
      </UtilityPagePanel>

      <UtilityPagePanel title="추가 요청사항">
        <Controller
          name="additionalNotes"
          control={control}
          render={({ field }) => (
            <Textarea
              id="additionalNotes"
              placeholder="참고할 내용이 있으면 자유롭게 작성해주세요"
              maxLength={500}
              className="min-h-24 rounded-lg border-zinc-300 shadow-none"
              {...field}
            />
          )}
        />
      </UtilityPagePanel>
    </div>
  );
};
