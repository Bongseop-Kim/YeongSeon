import { useOne, useUpdate } from "@refinedev/core";
import { Card, Typography, Select, Space, Button, message, Spin } from "antd";
import { useState, useEffect, useRef } from "react";
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
  const initialized = useRef(false);

  useEffect(() => {
    if (result?.value && !initialized.current) {
      initialized.current = true;
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
        onError: (error) => {
          message.error(`설정 저장에 실패했습니다: ${error.message}`);
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

  if (query.isError) {
    return (
      <Card>
        <Typography.Text type="danger">
          설정을 불러오는데 실패했습니다: {query.error?.message ?? "알 수 없는 오류"}
        </Typography.Text>
        <br />
        <Button onClick={() => query.refetch()} style={{ marginTop: 8 }}>
          다시 시도
        </Button>
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
          style={{ minWidth: 140, maxWidth: 200, flex: 1 }}
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
