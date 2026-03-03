import { Card, Typography, Select, Space, Button, Spin } from "antd";
import { COURIER_COMPANY_NAMES } from "@yeongseon/shared/constants/courier-companies";

import { useDefaultCourierForm } from "@/features/settings/api/settings-query";

const { Title } = Typography;

export function SettingsForm() {
  const {
    courierCompany,
    setCourierCompany,
    save,
    isLoading,
    isError,
    error,
    refetch,
    isSaving,
  } = useDefaultCourierForm();

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <Typography.Text type="danger">
          설정을 불러오는데 실패했습니다: {error?.message ?? "알 수 없는 오류"}
        </Typography.Text>
        <br />
        <Button onClick={() => refetch()} style={{ marginTop: 8 }}>
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
          value={courierCompany || undefined}
          placeholder="기본 택배사 선택"
          onChange={setCourierCompany}
          style={{ minWidth: 140, maxWidth: 200, flex: 1 }}
          options={COURIER_COMPANY_NAMES.map((name) => ({
            label: name,
            value: name,
          }))}
        />
        <Button type="primary" onClick={save} loading={isSaving} disabled={!courierCompany || isSaving}>
          저장
        </Button>
      </Space>
    </Card>
  );
}
