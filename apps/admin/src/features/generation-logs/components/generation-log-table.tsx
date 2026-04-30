import { Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/constants";
import { modelColor, requestTypeLabel } from "@/features/generation-logs/utils";
import { formatNullableLocaleNumber } from "@/utils/format-number";
import type { AdminGenerationLogGroup } from "@/features/generation-logs/types/admin-generation-log";

const { Text } = Typography;

interface GenerationLogTableProps {
  data: AdminGenerationLogGroup[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  aiModel: string | null;
  onAiModelChange: (model: string | null) => void;
}

const THUMB_SIZE = 54;

function ResultThumbnailGrid({ group }: { group: AdminGenerationLogGroup }) {
  const images = group.resultImages.slice(0, 4);
  const cells = Array.from({ length: 4 }, (_, index) => images[index] ?? null);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(2, ${THUMB_SIZE}px)`,
        gap: 4,
      }}
    >
      {cells.map((image, index) => (
        <div
          key={image?.logId ?? `empty-${index}`}
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: 6,
            border:
              image?.status === "error"
                ? "1px solid #ffccc7"
                : "1px solid #f0f0f0",
            background: image?.status === "error" ? "#fff2f0" : "#fafafa",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {image?.url ? (
            <img
              src={image.url}
              alt={`생성 결과 ${index + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 10 }}>
              이미지 없음
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

const renderGroupStatus = (group: AdminGenerationLogGroup) => {
  if (group.errorCount > 0) {
    return (
      <Tag color="error">
        {group.successCount}/{group.imageCount} 성공
      </Tag>
    );
  }

  return (
    <Tag color="success">
      {group.successCount}/{group.imageCount} 성공
    </Tag>
  );
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

  const columns: ColumnsType<AdminGenerationLogGroup> = [
    {
      title: "생성 결과",
      key: "resultImages",
      width: 132,
      render: (_, record) => <ResultThumbnailGrid group={record} />,
    },
    {
      title: "요청",
      dataIndex: "userMessage",
      key: "userMessage",
      ellipsis: true,
      render: (v: string, record) => (
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Text ellipsis style={{ maxWidth: 360 }}>
            {v}
          </Text>
          <Space wrap size={4}>
            <Tag color={modelColor(record.aiModel)}>{record.aiModel}</Tag>
            <Tag>{requestTypeLabel(record.requestType)}</Tag>
            {record.patternType && <Tag>{record.patternType}</Tag>}
            {record.fabricType && <Tag>{record.fabricType}</Tag>}
          </Space>
          <Text code style={{ fontSize: 11 }}>
            {record.workflowId}
          </Text>
        </Space>
      ),
    },
    {
      title: "이미지",
      key: "imageCount",
      width: 100,
      align: "center",
      render: (_, record) => renderGroupStatus(record),
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
      render: (_, record) =>
        record.errorCount > 0 ? (
          <Tag color="error">에러 {record.errorCount}</Tag>
        ) : (
          <Tag color="success">성공</Tag>
        ),
    },
    {
      title: "시각",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (v: string) => dayjs(v).format("MM-DD HH:mm:ss"),
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
          options={[{ value: "openai", label: "OpenAI" }]}
        />
      </Space>

      <Table<AdminGenerationLogGroup>
        columns={columns}
        dataSource={data}
        rowKey="workflowId"
        loading={loading}
        size="small"
        onRow={(record) => ({
          onClick: () => navigate(`/generation-logs/${record.primaryLogId}`),
          onKeyDown: (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            if (event.key === " ") event.preventDefault();
            navigate(`/generation-logs/${record.primaryLogId}`);
          },
          role: "button",
          tabIndex: 0,
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
        scroll={{ x: 980 }}
      />
    </>
  );
}
