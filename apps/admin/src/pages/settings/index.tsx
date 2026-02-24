import { useOne, useUpdate } from "@refinedev/core";
import { Card, Typography, Select, Space, Button, message, Spin } from "antd";
import { useState, useEffect } from "react";
import type { AdminSettingRowDTO } from "@yeongseon/shared";
import { COURIER_COMPANY_NAMES } from "@yeongseon/shared/constants/courier-companies";

const { Title } = Typography;

export default function SettingsPage() {
  const { query, result } = useOne<AdminSettingRowDTO>({
    resource: "admin_settings",
    id: "default_courier_company",
    meta: { idColumnName: "key" },
  });
  const isLoading = query.isLoading;

  const { mutate: updateSetting, mutation } = useUpdate();

  const [defaultCourier, setDefaultCourier] = useState<string>("");

  useEffect(() => {
    if (result?.value) {
      setDefaultCourier(result.value);
    }
  }, [result]);

  const handleSave = () => {
    updateSetting(
      {
        resource: "admin_settings",
        id: "default_courier_company",
        values: { value: defaultCourier },
        meta: { idColumnName: "key" },
      },
      {
        onSuccess: () => {
          message.success("설정이 저장되었습니다.");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <Card>
      <Title level={4}>관리자 설정</Title>

      <Title level={5} style={{ marginTop: 24 }}>
        기본 택배사
      </Title>
      <Space>
        <Select
          value={defaultCourier || undefined}
          placeholder="기본 택배사 선택"
          onChange={setDefaultCourier}
          style={{ width: 200 }}
          options={COURIER_COMPANY_NAMES.map((name) => ({
            label: name,
            value: name,
          }))}
        />
        <Button
          type="primary"
          onClick={handleSave}
          loading={mutation.isPending}
        >
          저장
        </Button>
      </Space>
    </Card>
  );
}
