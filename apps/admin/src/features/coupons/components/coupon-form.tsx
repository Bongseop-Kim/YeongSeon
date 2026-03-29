import type { ComponentProps } from "react";
import { useEffect } from "react";
import { DatePicker, Form, Input, InputNumber, Select, Switch } from "antd";
import type { FormInstance } from "antd";

interface CouponFormProps {
  form?: FormInstance;
  expiryDateItemProps?: Omit<ComponentProps<typeof Form.Item>, "children">;
}

export function CouponForm({ form, expiryDateItemProps }: CouponFormProps) {
  const discountType = Form.useWatch("discount_type", form);

  useEffect(() => {
    if (discountType !== "percentage") {
      form?.setFieldsValue({ max_discount_amount: undefined });
    }
  }, [discountType, form]);

  return (
    <>
      <Form.Item label="쿠폰명" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label="할인유형"
        name="discount_type"
        rules={[{ required: true }]}
      >
        <Select
          options={[
            { label: "퍼센트(%)", value: "percentage" },
            { label: "고정금액(원)", value: "fixed" },
          ]}
        />
      </Form.Item>
      <Form.Item
        label="할인값"
        name="discount_value"
        rules={[{ required: true }]}
      >
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>
      {discountType === "percentage" ? (
        <Form.Item
          label="최대할인금액"
          name="max_discount_amount"
          rules={[{ required: true, message: "최대할인금액을 입력해주세요" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      ) : null}
      <Form.Item label="설명" name="description">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item
        label="만료일"
        name="expiry_date"
        rules={[{ required: true }]}
        {...expiryDateItemProps}
      >
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="추가정보" name="additional_info">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item label="활성" name="is_active" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );
}
