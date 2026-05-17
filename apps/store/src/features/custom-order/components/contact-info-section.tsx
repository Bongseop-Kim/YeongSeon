import { Controller, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { Input } from "@/shared/ui-extended/input";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/shared/ui/field";
import { ChipSinglePicker } from "@/shared/composite/chip-single-picker";
import type { ContactMethod } from "@yeongseon/shared";

const CONTACT_METHOD_OPTIONS = [
  { value: "phone", label: "전화" },
  { value: "kakao", label: "카카오톡" },
  { value: "email", label: "이메일" },
] as const satisfies ReadonlyArray<{ value: ContactMethod; label: string }>;

const CONTACT_METHOD_PLACEHOLDERS: Record<ContactMethod, string> = {
  phone: "010-1234-5678",
  kakao: "카카오톡 ID",
  email: "example@email.com",
};

interface ContactInfoSectionProps {
  control: Control<QuoteOrderOptions>;
}

export const ContactInfoSection = ({ control }: ContactInfoSectionProps) => {
  const currentContactMethod = useWatch({
    control,
    name: "contactMethod",
  });

  return (
    <FieldSet className="gap-4">
      <div className="grid gap-4">
        <Controller
          name="contactName"
          control={control}
          render={({ field }) => (
            <Field orientation="vertical">
              <FieldLabel htmlFor="contactName">
                <FieldTitle>담당자 성함</FieldTitle>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="contactName"
                  placeholder="홍길동"
                  className="sm:w-1/2"
                  {...field}
                />
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          name="contactTitle"
          control={control}
          render={({ field }) => (
            <Field orientation="vertical">
              <FieldLabel htmlFor="contactTitle">
                <FieldTitle>직책 (선택)</FieldTitle>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="contactTitle"
                  placeholder="대리"
                  className="sm:w-1/2"
                  {...field}
                />
              </FieldContent>
            </Field>
          )}
        />
      </div>

      <div className="grid gap-4">
        <Controller
          name="contactMethod"
          control={control}
          render={({ field }) => (
            <Field orientation="vertical">
              <FieldLabel>
                <FieldTitle>연락 방법</FieldTitle>
              </FieldLabel>
              <FieldContent>
                <ChipSinglePicker
                  ariaLabel="연락 방법"
                  value={field.value}
                  onValueChange={(value) =>
                    field.onChange(value as ContactMethod)
                  }
                  options={CONTACT_METHOD_OPTIONS}
                />
              </FieldContent>
            </Field>
          )}
        />

        <Controller
          name="contactValue"
          control={control}
          render={({ field }) => (
            <Field orientation="vertical">
              <FieldLabel htmlFor="contactValue">
                <FieldTitle>연락처</FieldTitle>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="contactValue"
                  placeholder={
                    CONTACT_METHOD_PLACEHOLDERS[
                      currentContactMethod ?? "phone"
                    ] ?? "연락처를 입력해주세요"
                  }
                  className="sm:w-1/2"
                  {...field}
                />
              </FieldContent>
            </Field>
          )}
        />
      </div>
    </FieldSet>
  );
};
