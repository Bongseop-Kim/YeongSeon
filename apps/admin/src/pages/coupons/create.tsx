import { Create, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Select, DatePicker, Switch } from "antd";

export default function CouponCreate() {
  const { formProps, saveButtonProps } = useForm({
    resource: "coupons",
    redirect: "list",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" initialValues={{ is_active: true }}>
        <Form.Item label="쿠폰명" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="할인유형" name="discount_type" rules={[{ required: true }]}>
          <Select
            options={[
              { label: "퍼센트(%)", value: "percentage" },
              { label: "고정금액(원)", value: "fixed" },
            ]}
          />
        </Form.Item>
        <Form.Item label="할인값" name="discount_value" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="최대할인금액" name="max_discount_amount">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="설명" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="만료일" name="expiry_date" rules={[{ required: true }]}>
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="추가정보" name="additional_info">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="활성" name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
}
