import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { CouponForm } from "@/features/coupons";

export default function CouponCreate() {
  const { formProps, saveButtonProps } = useForm({
    resource: "coupons",
    redirect: "list",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{ is_active: true }}
      >
        <CouponForm form={formProps.form} />
      </Form>
    </Create>
  );
}
