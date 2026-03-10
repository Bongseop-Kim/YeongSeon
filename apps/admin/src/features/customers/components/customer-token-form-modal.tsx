import { useEffect } from "react";
import { Button, Form, Input, InputNumber, Modal } from "antd";
import { useManageCustomerTokensMutation } from "../api/customers-query";
import type { AdminTokenManageForm } from "../types/admin-customer";

interface CustomerTokenFormModalProps {
  userId: string;
  mode: "grant" | "deduct";
  open: boolean;
  onClose: () => void;
}

type CustomerTokenFormValues = AdminTokenManageForm;

const MODAL_TITLE: Record<CustomerTokenFormModalProps["mode"], string> = {
  grant: "토큰 지급",
  deduct: "토큰 차감",
};

const { TextArea } = Input;

export function CustomerTokenFormModal({
  userId,
  mode,
  open,
  onClose,
}: CustomerTokenFormModalProps) {
  const [form] = Form.useForm<CustomerTokenFormValues>();
  const mutation = useManageCustomerTokensMutation();

  useEffect(() => {
    form.setFieldValue("mode", mode);

    if (!open) {
      form.resetFields();
    }
  }, [form, mode, open]);

  const handleFinish = async (values: CustomerTokenFormValues) => {
    const amount = mode === "deduct" ? -values.amount : values.amount;

    try {
      await mutation.mutateAsync({
        userId,
        amount,
        description: values.description,
      });

      form.resetFields();
      onClose();
    } catch {
      // Mutation onError already handles user-facing errors.
    }
  };

  return (
    <Modal
      title={MODAL_TITLE[mode]}
      open={open}
      closable={!mutation.isPending}
      maskClosable={!mutation.isPending}
      onCancel={mutation.isPending ? undefined : onClose}
      footer={null}
      destroyOnHidden
    >
      <Form<CustomerTokenFormValues>
        form={form}
        layout="vertical"
        initialValues={{ mode, amount: undefined, description: "" }}
        onFinish={handleFinish}
      >
        <Form.Item name="mode" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          label="수량"
          name="amount"
          rules={[
            { required: true, message: "수량을 입력해주세요." },
            { type: "number", min: 1, message: "1 이상의 값을 입력해주세요." },
          ]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="설명"
          name="description"
          rules={[{ required: true, message: "설명을 입력해주세요." }]}
        >
          <TextArea rows={4} />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={mutation.isPending}
          block
        >
          {MODAL_TITLE[mode]}
        </Button>
      </Form>
    </Modal>
  );
}
