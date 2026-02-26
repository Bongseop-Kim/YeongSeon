import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/features/custom-order/components/ImageUpload";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

interface AttachmentStepProps {
  imageUpload: ImageUploadHook;
}

export const AttachmentStep = ({ imageUpload }: AttachmentStepProps) => {
  const { control } = useFormContext<QuoteOrderOptions>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          참고 자료를 첨부해주세요
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          선택사항입니다. 건너뛰어도 됩니다.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <ImageUpload
            uploadedImages={imageUpload.uploadedImages}
            isUploading={imageUpload.isUploading}
            onFileSelect={imageUpload.uploadFile}
            onRemoveImage={imageUpload.removeImage}
          />

          <div>
            <Label className="text-sm font-medium text-zinc-900 mb-2 block">
              추가 요청사항
            </Label>
            <Controller
              name="additionalNotes"
              control={control}
              render={({ field }) => (
                <Textarea
                  placeholder="참고할 내용이 있으면 자유롭게 작성해주세요"
                  maxLength={500}
                  {...field}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
