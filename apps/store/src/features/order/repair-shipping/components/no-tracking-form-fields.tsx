import { Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";
import { ImagePicker } from "@/shared/composite/image-picker";
import {
  REPAIR_NO_TRACKING_REASONS,
  type RepairNoTrackingReason,
} from "@/shared/constants/REPAIR_SHIPPING";

interface NoTrackingFormFieldsProps {
  /** 같은 화면에 중복 배치될 때 id 충돌 방지 */
  idPrefix: string;
  reason: RepairNoTrackingReason | "";
  onReasonChange: (value: RepairNoTrackingReason) => void;
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  memo: string;
  onMemoChange: (value: string) => void;
  /** 이미 업로드된 사진 URL (주문서에서 넘어온 prefill) */
  photoUrls?: string[];
  onPhotoUrlsChange?: (urls: string[]) => void;
}

/**
 * 송장번호가 없는 경우: 사유 + 발송 사진(선택·권장) + 메모.
 * 등록 시 "발송 확인 중" 상태로 분류된다.
 */
export function NoTrackingFormFields({
  idPrefix,
  reason,
  onReasonChange,
  photos,
  onPhotosChange,
  memo,
  onMemoChange,
  photoUrls,
  onPhotoUrlsChange,
}: NoTrackingFormFieldsProps) {
  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-reason`}>
          <FieldTitle>접수 사유</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Select
            value={reason}
            onValueChange={(v) => onReasonChange(v as RepairNoTrackingReason)}
          >
            <SelectTrigger id={`${idPrefix}-reason`} className="w-full">
              <SelectValue placeholder="사유를 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {REPAIR_NO_TRACKING_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-photos`}>
          <FieldTitle>
            발송 사진 <span className="font-normal text-zinc-400">(선택)</span>
          </FieldTitle>
        </FieldLabel>
        <FieldContent>
          <FieldDescription className="mt-0">
            사진을 첨부하면 확인이 훨씬 빨라져요.
          </FieldDescription>
          <ImagePicker
            id={`${idPrefix}-photos`}
            multi
            maxFiles={3}
            selectedFiles={photos}
            onFilesChange={onPhotosChange}
            previewUrls={photoUrls}
            onPreviewUrlsChange={onPhotoUrlsChange}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-memo`}>
          <FieldTitle>
            메모 <span className="font-normal text-zinc-400">(선택)</span>
          </FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Textarea
            id={`${idPrefix}-memo`}
            placeholder="예: 6/7 오전 퀵으로 보냈습니다"
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
          />
        </FieldContent>
      </Field>
      <p className="flex gap-2 text-sm leading-6 text-zinc-500">
        <Info className="mt-1 size-4 shrink-0" />
        <span>
          송장번호 없이 접수하면 입고 확인까지 시간이 걸릴 수 있어요. 확인
          전까지 &lsquo;발송 확인 중&rsquo;으로 표시됩니다.
        </span>
      </p>
    </FieldGroup>
  );
}
