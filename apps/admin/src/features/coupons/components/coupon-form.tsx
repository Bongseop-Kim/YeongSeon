import { Text } from "seed-design/ui/text";
import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { useController, type Control, type FieldErrors } from "react-hook-form";
import { ActionButton } from "seed-design/ui/action-button";
import {
  RadioSelectBoxItem,
  RadioSelectBoxRoot,
} from "seed-design/ui/select-box";
import { Switch } from "seed-design/ui/switch";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";
import type {
  AdminCouponFormValues,
  CouponDiscountType,
} from "@/features/coupons/types/admin-coupon";
import "./coupon-admin.css";

interface CouponFormProps {
  control: Control<AdminCouponFormValues>;
  errors: FieldErrors<AdminCouponFormValues>;
  submitting: boolean;
  submitLabel: string;
  isDirty: boolean;
  dirtyCount: number;
  onCancel: () => void;
}

interface FieldErrorProps {
  message?: string;
}

interface ControlledTextFieldProps {
  control: Control<AdminCouponFormValues>;
  name: keyof AdminCouponFormValues;
  label: string;
  type?: HTMLInputTypeAttribute;
  required?: boolean;
  validate?: (value: unknown) => true | string;
  error?: string;
  textarea?: boolean;
  min?: number;
  className?: string;
}

function isCouponDiscountType(value: string): value is CouponDiscountType {
  return value === "percentage" || value === "fixed";
}

function FieldError({ message }: FieldErrorProps): ReactNode {
  return message ? <>{message}</> : null;
}

function createNumberValidator(
  label: string,
  min = 0,
): (value: unknown) => true | string {
  return (nextValue) => {
    const value = Number(nextValue);

    if (nextValue == null || !Number.isInteger(value) || value < min) {
      return `${label}은 ${min} 이상의 정수로 입력해주세요.`;
    }

    return true;
  };
}

function ControlledTextField({
  control,
  name,
  label,
  type = "text",
  required,
  validate,
  error,
  textarea,
  min,
  className,
}: ControlledTextFieldProps): ReactNode {
  const fieldValidator =
    type === "number" ? createNumberValidator(label, min) : validate;
  const { field } = useController({
    control,
    name,
    rules: {
      required: required ? `${label}을 입력해주세요.` : false,
      validate: fieldValidator,
    },
  });
  const value = field.value == null ? "" : String(field.value);

  return (
    <TextField
      className={className}
      label={label}
      name={name}
      value={value}
      required={required}
      showRequiredIndicator={required}
      invalid={Boolean(error)}
      errorMessage={<FieldError message={error} />}
      onValueChange={({ value: nextValue }) => {
        if (type === "number") {
          field.onChange(nextValue === "" ? null : Number(nextValue));
          return;
        }
        field.onChange(nextValue);
      }}
    >
      {textarea ? (
        <TextFieldTextarea
          name={name}
          autoComplete="off"
          onBlur={field.onBlur}
        />
      ) : (
        <TextFieldInput
          ref={field.ref}
          name={name}
          type={type}
          autoComplete="off"
          min={type === "number" ? (min ?? 0) : undefined}
          inputMode={type === "number" ? "numeric" : undefined}
          onBlur={field.onBlur}
        />
      )}
    </TextField>
  );
}

export function CouponForm({
  control,
  errors,
  submitting,
  submitLabel,
  isDirty,
  dirtyCount,
  onCancel,
}: CouponFormProps): ReactNode {
  const { field: discountTypeField } = useController({
    control,
    name: "discountType",
    rules: { required: "할인유형을 선택해주세요" },
  });
  const { field: isActiveField } = useController({
    control,
    name: "isActive",
  });
  const { field: maxDiscountAmountField } = useController({
    control,
    name: "maxDiscountAmount",
  });

  const discountType = discountTypeField.value;

  return (
    <div className="couponForm adminSettingsForm">
      <ControlledTextField
        className="adminSettingsField"
        control={control}
        name="name"
        label="내부 관리명"
        required
        error={errors.name?.message}
      />

      <ControlledTextField
        className="adminSettingsField"
        control={control}
        name="displayName"
        label="고객 표시명"
        required
        validate={(value) =>
          typeof value === "string" && value.trim().length > 0
            ? true
            : "표시명은 비워둘 수 없습니다"
        }
        error={errors.displayName?.message}
      />

      <RadioSelectBoxRoot
        className="adminSettingsField"
        label="할인유형"
        name={discountTypeField.name}
        value={discountTypeField.value}
        onValueChange={(value) => {
          if (!isCouponDiscountType(value)) {
            return;
          }

          discountTypeField.onChange(value);
          if (value !== "percentage") {
            maxDiscountAmountField.onChange(null);
          }
        }}
        invalid={Boolean(errors.discountType)}
        errorMessage={<FieldError message={errors.discountType?.message} />}
        showRequiredIndicator
        columns={2}
      >
        <RadioSelectBoxItem value="percentage" label="퍼센트(%)" />
        <RadioSelectBoxItem value="fixed" label="고정금액(원)" />
      </RadioSelectBoxRoot>

      <ControlledTextField
        className="adminSettingsField"
        control={control}
        name="discountValue"
        label="할인값"
        type="number"
        min={1}
        required
        error={errors.discountValue?.message}
      />

      {discountType === "percentage" ? (
        <ControlledTextField
          className="adminSettingsField"
          control={control}
          name="maxDiscountAmount"
          label="최대할인금액"
          type="number"
          min={1}
          required
          error={errors.maxDiscountAmount?.message}
        />
      ) : null}

      <ControlledTextField
        className="adminSettingsFieldFull"
        control={control}
        name="description"
        label="설명"
        textarea
        error={errors.description?.message}
      />

      <ControlledTextField
        className="adminSettingsField"
        control={control}
        name="expiryDate"
        label="만료일"
        type="date"
        required
        error={errors.expiryDate?.message}
      />

      <ControlledTextField
        className="adminSettingsFieldFull"
        control={control}
        name="additionalInfo"
        label="추가정보"
        textarea
        error={errors.additionalInfo?.message}
      />

      <div className="couponFormActions adminSettingsActionRow">
        <div className="couponActionMeta">
          <Switch
            checked={isActiveField.value}
            onCheckedChange={isActiveField.onChange}
            label="활성"
            inputProps={{
              name: isActiveField.name,
              onBlur: isActiveField.onBlur,
            }}
          />
          {isDirty ? (
            <Text
              as="p"
              textStyle="t4Regular"
              className="couponSaveSummary adminSettingsActionSummary"
            >
              저장하지 않은 변경사항 {dirtyCount}개가 있습니다.
            </Text>
          ) : null}
        </div>
        <div className="couponActionButtons">
          {isDirty ? (
            <ActionButton
              type="button"
              variant="neutralWeak"
              disabled={submitting}
              onClick={onCancel}
            >
              변경 취소
            </ActionButton>
          ) : null}
          <ActionButton
            type="submit"
            loading={submitting}
            disabled={submitting || !isDirty}
          >
            {submitLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
