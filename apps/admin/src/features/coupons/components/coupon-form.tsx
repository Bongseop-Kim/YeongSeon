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
  error?: string;
  textarea?: boolean;
}

function isCouponDiscountType(value: string): value is CouponDiscountType {
  return value === "percentage" || value === "fixed";
}

function FieldError({ message }: FieldErrorProps): ReactNode {
  return message ? <>{message}</> : null;
}

function ControlledTextField({
  control,
  name,
  label,
  type = "text",
  required,
  error,
  textarea,
}: ControlledTextFieldProps): ReactNode {
  const { field } = useController({ control, name });
  const value = field.value == null ? "" : String(field.value);

  return (
    <TextField
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
        <TextFieldTextarea onBlur={field.onBlur} />
      ) : (
        <TextFieldInput
          ref={field.ref}
          type={type}
          autoComplete="off"
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
  onCancel,
}: CouponFormProps) {
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
    <div className="couponForm">
      <ControlledTextField
        control={control}
        name="name"
        label="쿠폰명"
        required
        error={errors.name?.message}
      />

      <RadioSelectBoxRoot
        label="할인유형"
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
        control={control}
        name="discountValue"
        label="할인값"
        type="number"
        required
        error={errors.discountValue?.message}
      />

      {discountType === "percentage" ? (
        <ControlledTextField
          control={control}
          name="maxDiscountAmount"
          label="최대할인금액"
          type="number"
          required
          error={errors.maxDiscountAmount?.message}
        />
      ) : null}

      <ControlledTextField
        control={control}
        name="description"
        label="설명"
        textarea
        error={errors.description?.message}
      />

      <ControlledTextField
        control={control}
        name="expiryDate"
        label="만료일"
        type="date"
        required
        error={errors.expiryDate?.message}
      />

      <ControlledTextField
        control={control}
        name="additionalInfo"
        label="추가정보"
        textarea
        error={errors.additionalInfo?.message}
      />

      <Switch
        checked={isActiveField.value}
        onCheckedChange={isActiveField.onChange}
        label="활성"
        inputProps={{ name: isActiveField.name, onBlur: isActiveField.onBlur }}
      />

      <div className="couponFormActions">
        <ActionButton type="submit" loading={submitting} disabled={submitting}>
          {submitLabel}
        </ActionButton>
        <ActionButton type="button" variant="neutralWeak" onClick={onCancel}>
          취소
        </ActionButton>
      </div>
    </div>
  );
}
