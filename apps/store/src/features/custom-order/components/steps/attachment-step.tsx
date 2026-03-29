import { Controller, useFormContext } from "react-hook-form";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
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
      <UtilityPagePanel
        title="참고 이미지"
        description="패턴, 색상, 봉제 디테일이 보이는 이미지를 함께 전달해 주세요."
      >
        <ImageUpload
          uploadedImages={imageUpload.uploadedImages}
          isUploading={imageUpload.isUploading}
          onFileSelect={imageUpload.uploadFile}
          onRemoveImage={imageUpload.removeImage}
        />
      </UtilityPagePanel>

      <UtilityPagePanel
        title="추가 요청사항"
        description="제작 시 반드시 반영해야 할 내용을 짧게 정리해 주세요."
        contentClassName="space-y-2"
      >
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
      </UtilityPagePanel>
    </StepLayout>
  );
};
