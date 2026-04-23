import { Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/api/generation-logs-query";
import { modelColor, requestTypeLabel } from "@/features/generation-logs/utils";
import { formatNullableLocaleNumber } from "@/utils/format-number";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const { Text } = Typography;

interface GenerationLogTableProps {
  data: AdminGenerationLogItem[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  aiModel: string | null;
  onAiModelChange: (model: string | null) => void;
}

const renderGenerateImageStatus = (
  generateImage: boolean | null | undefined,
  imageGenerated: boolean,
) => {
  if (!generateImage) return <Tag>미요청</Tag>;
  return imageGenerated ? <Tag color="success">성공</Tag> : <Tag>실패</Tag>;
};

export function GenerationLogTable({
  data,
  loading,
  page,
  hasMore,
  onPageChange,
  aiModel,
  onAiModelChange,
}: GenerationLogTableProps) {
  const navigate = useNavigate();

  const columns: ColumnsType<AdminGenerationLogItem> = [
    {
      title: "시각",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (v: string) => dayjs(v).format("MM-DD HH:mm:ss"),
    },
    {
      title: "모델",
      dataIndex: "aiModel",
      key: "aiModel",
      width: 80,
      render: (v: string) => <Tag color={modelColor(v)}>{v}</Tag>,
    },
    {
      title: "요청 유형",
      dataIndex: "requestType",
      key: "requestType",
      width: 120,
      render: (v: string | null) => requestTypeLabel(v),
    },
    {
      title: "프롬프트",
      dataIndex: "userMessage",
      key: "userMessage",
      ellipsis: true,
      render: (v: string) => (
        <Text ellipsis style={{ maxWidth: 240 }}>
          {v}
        </Text>
      ),
    },
    {
      title: "턴",
      dataIndex: "conversationTurn",
      key: "conversationTurn",
      width: 50,
      align: "right",
    },
    {
      title: "이미지",
      dataIndex: "imageGenerated",
      key: "imageGenerated",
      width: 70,
      align: "center",
      render: (v: boolean, record) =>
        renderGenerateImageStatus(record.generateImage, v),
    },
    {
      title: "토큰",
      key: "tokens",
      width: 90,
      align: "right",
      render: (_, record) => {
        const net = record.tokensCharged - record.tokensRefunded;
        return (
          <span>
            {net}
            {record.tokensRefunded > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {" "}
                (-{record.tokensRefunded})
              </Text>
            )}
          </span>
        );
      },
    },
    {
      title: "응답(ms)",
      dataIndex: "totalLatencyMs",
      key: "totalLatencyMs",
      width: 90,
      align: "right",
      render: (v: number | null) => formatNullableLocaleNumber(v),
    },
    {
      title: "상태",
      dataIndex: "errorType",
      key: "errorType",
      width: 90,
      render: (v: string | null) =>
        v ? <Tag color="error">{v}</Tag> : <Tag color="success">성공</Tag>,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="모든 모델"
          value={aiModel}
          onChange={onAiModelChange}
          allowClear
          style={{ width: 140 }}
          options={[
            { value: "openai", label: "OpenAI" },
            { value: "gemini", label: "Gemini" },
            { value: "fal", label: "Fal.ai" },
          ]}
        />
      </Space>

      <Table<AdminGenerationLogItem>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        onRow={(record) => ({
          onClick: () => navigate(`/generation-logs/${record.id}`),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize: GENERATION_LOG_PAGE_SIZE,
          total: hasMore
            ? page * GENERATION_LOG_PAGE_SIZE + 1
            : (page - 1) * GENERATION_LOG_PAGE_SIZE + data.length,
          onChange: onPageChange,
          showSizeChanger: false,
          simple: true,
        }}
        scroll={{ x: 900 }}
      />
    </>
  );
}
