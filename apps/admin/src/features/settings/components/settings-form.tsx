import {
  Card,
  Typography,
  Select,
  Space,
  Button,
  Spin,
  InputNumber,
} from "antd";
import { COURIER_COMPANY_NAMES } from "@yeongseon/shared/constants/courier-companies";

import {
  useDefaultCourierForm,
  useDesignTokenInitialGrantForm,
} from "@/features/settings/api/settings-query";

const { Title } = Typography;
const SECTION_TITLE_STYLE = { marginTop: 24 } as const;

interface SettingsErrorCardProps {
  errorMessage: string;
  onRetry: () => void;
}

function SettingsErrorCard({ errorMessage, onRetry }: SettingsErrorCardProps) {
  return (
    <Card>
      <Typography.Text type="danger">
        설정을 불러오는데 실패했습니다: {errorMessage}
      </Typography.Text>
      <br />
      <Button onClick={onRetry} style={{ marginTop: 8 }}>
        다시 시도
      </Button>
    </Card>
  );
}

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

  const {
    amount,
    setAmount,
    save: saveTokenGrant,
    isLoading: isTokenGrantLoading,
    isError: isTokenGrantError,
    error: tokenGrantError,
    refetch: refetchTokenGrant,
    isSaving: isTokenGrantSaving,
  } = useDesignTokenInitialGrantForm();

  if (isLoading || isTokenGrantLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (isError) {
    return (
      <SettingsErrorCard
        errorMessage={error?.message ?? "알 수 없는 오류"}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isTokenGrantError) {
    return (
      <SettingsErrorCard
        errorMessage={tokenGrantError?.message ?? "알 수 없는 오류"}
        onRetry={() => void refetchTokenGrant()}
      />
    );
  }

  return (
    <Card>
      <Title level={4}>관리자 설정</Title>

      <Title level={5} style={SECTION_TITLE_STYLE}>
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
        <Button
          type="primary"
          onClick={save}
          loading={isSaving}
          disabled={!courierCompany || isSaving}
        >
          저장
        </Button>
      </Space>

      <Title level={5} style={SECTION_TITLE_STYLE}>
        신규 가입 토큰 지급량
      </Title>
      <Space>
        <InputNumber
          value={amount}
          min={1}
          step={1}
          precision={0}
          onChange={(value) => setAmount(value ?? 30)}
        />
        <Button
          type="primary"
          onClick={saveTokenGrant}
          loading={isTokenGrantSaving}
          disabled={isTokenGrantSaving}
        >
          저장
        </Button>
      </Space>
    </Card>
  );
}
