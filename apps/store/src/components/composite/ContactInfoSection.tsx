import { Controller, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";
import { useId } from "react";
import { Input } from "@/components/ui-extended/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
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
  const contactMethodTitleId = useId();
  const currentContactMethod = useWatch({
    control,
    name: "contactMethod",
  });

  return (
    <FieldSet className="gap-4">
      <FieldLegend>담당자 연락처</FieldLegend>

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="contactName"
          control={control}
          render={({ field }) => (
            <Field orientation="vertical">
              <FieldLabel htmlFor="contactName">
                <FieldTitle>
                  담당자 성함 <span className="text-red-500">*</span>
                </FieldTitle>
              </FieldLabel>
              <FieldContent>
                <Input id="contactName" placeholder="홍길동" {...field} />
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
                <FieldTitle>직책</FieldTitle>
              </FieldLabel>
              <FieldContent>
                <Input id="contactTitle" placeholder="대리" {...field} />
              </FieldContent>
            </Field>
          )}
        />
      </div>

      <Controller
        name="contactMethod"
        control={control}
        render={({ field }) => (
          <Field orientation="vertical">
            <FieldLabel>
              <FieldTitle id={contactMethodTitleId}>
                연락 방법 <span className="text-red-500">*</span>
              </FieldTitle>
            </FieldLabel>
            <FieldContent>
              <RadioGroup
                aria-labelledby={contactMethodTitleId}
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-row gap-4"
              >
                {CONTACT_METHOD_OPTIONS.map((option) => {
                  const itemId = `contact-method-${option.value}`;
                  return (
                    <Field key={option.value} orientation="horizontal">
                      <RadioGroupItem value={option.value} id={itemId} />
                      <FieldLabel htmlFor={itemId}>
                        <FieldTitle>{option.label}</FieldTitle>
                      </FieldLabel>
                    </Field>
                  );
                })}
              </RadioGroup>
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
              <FieldTitle>
                연락처 <span className="text-red-500">*</span>
              </FieldTitle>
            </FieldLabel>
            <FieldContent>
              <Input
                id="contactValue"
                placeholder={
                  CONTACT_METHOD_PLACEHOLDERS[
                    currentContactMethod ?? "phone"
                  ] ?? "연락처를 입력해주세요"
                }
                {...field}
              />
            </FieldContent>
          </Field>
        )}
      />
    </FieldSet>
  );
};
