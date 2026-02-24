import { Edit, useForm } from "@refinedev/antd";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Button,
  Modal,
  Table,
  Tag,
} from "antd";
import { useList, useCreate } from "@refinedev/core";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import dayjs from "dayjs";

export default function CouponEdit() {
  const { formProps, saveButtonProps, id } = useForm({
    resource: "coupons",
    redirect: "list",
  });

  const [issueModal, setIssueModal] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; phone: string }[]
  >([]);

  const { result: issuedResult } = useList({
    resource: "admin_user_coupon_view",
    filters: [{ field: "couponId", operator: "eq", value: id }],
    queryOptions: { enabled: !!id },
  });

  const { mutate: issueToUser, mutation: issueMutation } = useCreate();

  const handleSearchUser = async (value: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, phone")
      .eq("role", "customer")
      .ilike("name", `%${value}%`)
      .limit(10);

    setSearchResults(data ?? []);
  };

  const handleIssue = (userId: string) => {
    issueToUser(
      {
        resource: "user_coupons",
        values: {
          user_id: userId,
          coupon_id: id,
          status: "active",
        },
      },
      { onSuccess: () => setIssueModal(false) }
    );
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
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
        <Form.Item
          label="만료일"
          name="expiry_date"
          rules={[{ required: true }]}
          getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
          getValueFromEvent={(date: dayjs.Dayjs | null) => date?.format("YYYY-MM-DD") ?? null}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="추가정보" name="additional_info">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="활성" name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>

      <Button
        type="primary"
        onClick={() => setIssueModal(true)}
        style={{ marginTop: 16, marginBottom: 16 }}
      >
        쿠폰 발급
      </Button>

      <Table
        dataSource={issuedResult.data}
        rowKey="id"
        pagination={false}
        size="small"
        title={() => `발급 내역 (${issuedResult.data?.length ?? 0}건)`}
      >
        <Table.Column dataIndex="userName" title="이름" />
        <Table.Column dataIndex="userEmail" title="이메일" />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag>{v}</Tag>}
        />
        <Table.Column dataIndex="issuedAt" title="발급일" />
      </Table>

      <Modal
        title="쿠폰 발급"
        open={issueModal}
        onCancel={() => setIssueModal(false)}
        footer={null}
      >
        <Input.Search
          placeholder="고객명 검색"
          onSearch={handleSearchUser}
          style={{ marginBottom: 16 }}
        />
        <Table dataSource={searchResults} rowKey="id" pagination={false} size="small">
          <Table.Column dataIndex="name" title="이름" />
          <Table.Column dataIndex="phone" title="전화번호" />
          <Table.Column
            title="발급"
            render={(_: unknown, record: { id: string }) => (
              <Button
                size="small"
                type="link"
                loading={issueMutation.isPending}
                onClick={() => handleIssue(record.id)}
              >
                발급
              </Button>
            )}
          />
        </Table>
      </Modal>
    </Edit>
  );
}
