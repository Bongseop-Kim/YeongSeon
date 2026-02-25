import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { FormSection } from "@/components/ui/form-section";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

const CONTACT_METHOD_OPTIONS = [
  { value: "phone", label: "전화" },
  { value: "kakao", label: "카카오톡" },
  { value: "email", label: "이메일" },
];

const CONTACT_METHOD_PLACEHOLDERS: Record<string, string> = {
  phone: "010-1234-5678",
  kakao: "카카오톡 ID",
  email: "example@email.com",
};

interface ContactInfoSectionProps {
  control: Control<QuoteOrderOptions>;
  contactMethod: string;
}

export const ContactInfoSection = ({
  control,
  contactMethod,
}: ContactInfoSectionProps) => {
  return (
    <FormSection title="담당자 연락처">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="contactName"
            className="text-sm font-medium text-zinc-900 mb-2 block"
          >
            담당자 성함 <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="contactName"
            control={control}
            render={({ field }) => (
              <Input id="contactName" placeholder="홍길동" {...field} />
            )}
          />
        </div>
        <div>
          <Label
            htmlFor="contactTitle"
            className="text-sm font-medium text-zinc-900 mb-2 block"
          >
            직책
          </Label>
          <Controller
            name="contactTitle"
            control={control}
            render={({ field }) => (
              <Input id="contactTitle" placeholder="대리" {...field} />
            )}
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-zinc-900 mb-2 block">
          연락 방법 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="contactMethod"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={CONTACT_METHOD_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              namePrefix="contactMethod"
              className="flex flex-row gap-4"
            />
          )}
        />
      </div>

      <div>
        <Label
          htmlFor="contactValue"
          className="text-sm font-medium text-zinc-900 mb-2 block"
        >
          연락처 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="contactValue"
          control={control}
          render={({ field }) => (
            <Input
              id="contactValue"
              placeholder={
                CONTACT_METHOD_PLACEHOLDERS[contactMethod] ?? "연락처를 입력해주세요"
              }
              {...field}
            />
          )}
        />
      </div>
    </FormSection>
  );
};
