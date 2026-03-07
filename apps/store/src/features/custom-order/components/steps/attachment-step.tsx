import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/features/custom-order/components/image-upload";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import { StepLayout } from "./step-layout";

interface AttachmentStepProps {
  imageUpload: ImageUploadHook;
}

export const AttachmentStep = ({ imageUpload }: AttachmentStepProps) => {
  const { control } = useFormContext<QuoteOrderOptions>();

  return (
    <StepLayout
      guideTitle="업로드 팁"
      guideItems={[
        "정면/근접 이미지를 함께 첨부",
        "색상 기준(팬톤/샘플) 명시",
        "요청사항은 번호로 정리",
      ]}
    >
      <Card>
        <CardContent className="px-4 py-4">
          <ImageUpload
            uploadedImages={imageUpload.uploadedImages}
            isUploading={imageUpload.isUploading}
            onFileSelect={imageUpload.uploadFile}
            onRemoveImage={imageUpload.removeImage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 px-4 py-4">
          <Label htmlFor="additionalNotes">추가 요청사항</Label>
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
        </CardContent>
      </Card>
    </StepLayout>
  );
};
