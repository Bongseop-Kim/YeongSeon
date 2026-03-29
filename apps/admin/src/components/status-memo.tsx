import { Input, Space, Typography } from "antd";

const { Text } = Typography;
const { TextArea } = Input;

interface StatusMemoProps {
  value: string;
  onChange: (value: string) => void;
}

export function StatusMemo({ value, onChange }: StatusMemoProps) {
  return (
    <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
      <div>
        <Text strong>상태 변경 메모</Text>
        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="상태 변경 사유 (이력에 기록됨)"
          style={{ marginTop: 4 }}
        />
      </div>
    </Space>
  );
}
