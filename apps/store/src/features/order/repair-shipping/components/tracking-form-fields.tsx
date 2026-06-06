import { Input } from "@/shared/ui-extended/input";
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
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { ImagePicker } from "@/shared/composite/image-picker";
import { COURIER_COMPANIES } from "@yeongseon/shared/constants/courier-companies";

interface TrackingFormFieldsProps {
  /** 같은 화면에 중복 배치될 때 id 충돌 방지 */
  idPrefix: string;
  courierCompany: string;
  onCourierCompanyChange: (value: string) => void;
  trackingNumber: string;
  onTrackingNumberChange: (value: string) => void;
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  /** 이미 업로드된 사진 URL (주문서에서 넘어온 prefill) */
  photoUrls?: string[];
  onPhotoUrlsChange?: (urls: string[]) => void;
}

/** 송장번호가 있는 경우: 택배사 + 송장번호 + 발송 사진(선택) */
export function TrackingFormFields({
  idPrefix,
  courierCompany,
  onCourierCompanyChange,
  trackingNumber,
  onTrackingNumberChange,
  photos,
  onPhotosChange,
  photoUrls,
  onPhotoUrlsChange,
}: TrackingFormFieldsProps) {
  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-courier`}>
          <FieldTitle>택배사</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Select value={courierCompany} onValueChange={onCourierCompanyChange}>
            <SelectTrigger id={`${idPrefix}-courier`} className="w-full">
              <SelectValue placeholder="택배사 선택" />
            </SelectTrigger>
            <SelectContent>
              {COURIER_COMPANIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-tracking-number`}>
          <FieldTitle>송장번호</FieldTitle>
        </FieldLabel>
        <FieldContent>
          <Input
            id={`${idPrefix}-tracking-number`}
            type="text"
            placeholder="송장번호를 입력해주세요"
            value={trackingNumber}
            onChange={(e) => onTrackingNumberChange(e.target.value)}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-photos`}>
          <FieldTitle>
            발송 사진 <span className="font-normal text-zinc-400">(선택)</span>
          </FieldTitle>
        </FieldLabel>
        <FieldContent>
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
    </FieldGroup>
  );
}
