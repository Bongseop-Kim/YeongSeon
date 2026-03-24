import { useState } from "react";
import {
  Table,
  Tag,
  Select,
  Space,
  Typography,
  Modal,
  Descriptions,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/api/generation-logs-query";
import { formatNullableLocaleNumber } from "@/utils/format-number";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const { Text } = Typography;

interface GenerationLogTableProps {
  data: AdminGenerationLogItem[];
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  aiModel: string | null;
  onAiModelChange: (model: string | null) => void;
}

export function GenerationLogTable({
  data,
  loading,
  page,
  onPageChange,
  aiModel,
  onAiModelChange,
}: GenerationLogTableProps) {
  const [selectedLog, setSelectedLog] = useState<AdminGenerationLogItem | null>(
    null,
  );

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
      render: (v: string) => (
        <Tag color={v === "openai" ? "blue" : "green"}>{v}</Tag>
      ),
    },
    {
      title: "요청 유형",
      dataIndex: "requestType",
      key: "requestType",
      width: 120,
      render: (v: string | null) =>
        v === "text_and_image"
          ? "텍스트+이미지"
          : v === "text_only"
            ? "텍스트만"
            : "-",
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
      render: (v: boolean, record) => {
        if (!record.generateImage) return <Tag>미요청</Tag>;
        return v ? (
          <Tag color="success">성공</Tag>
        ) : (
          <Tag color="error">실패</Tag>
        );
      },
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
          onClick: () => setSelectedLog(record),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize: GENERATION_LOG_PAGE_SIZE,
          onChange: onPageChange,
          showSizeChanger: false,
          simple: true,
        }}
        scroll={{ x: 900 }}
      />

      <Modal
        open={selectedLog !== null}
        title="생성 로그 상세"
        onCancel={() => setSelectedLog(null)}
        footer={null}
        width={720}
      >
        {selectedLog && <GenerationLogDetail log={selectedLog} />}
      </Modal>
    </>
  );
}

function GenerationLogDetail({ log }: { log: AdminGenerationLogItem }) {
  return (
    <Descriptions column={2} size="small" bordered>
      <Descriptions.Item label="work_id" span={2}>
        <Text code style={{ fontSize: 11 }}>
          {log.workId}
        </Text>
      </Descriptions.Item>
      <Descriptions.Item label="AI 모델">{log.aiModel}</Descriptions.Item>
      <Descriptions.Item label="요청 유형">
        {log.requestType ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="품질">{log.quality ?? "-"}</Descriptions.Item>
      <Descriptions.Item label="이미지 생성">
        {log.generateImage ? (log.imageGenerated ? "성공" : "실패") : "미요청"}
      </Descriptions.Item>
      <Descriptions.Item label="프롬프트 길이">
        {log.promptLength}자
      </Descriptions.Item>
      <Descriptions.Item label="대화 턴">
        {log.conversationTurn}
      </Descriptions.Item>
      <Descriptions.Item label="CI 이미지">
        {log.hasCiImage ? "있음" : "없음"}
      </Descriptions.Item>
      <Descriptions.Item label="레퍼런스 이미지">
        {log.hasReferenceImage ? "있음" : "없음"}
      </Descriptions.Item>
      <Descriptions.Item label="이전 이미지(편집)">
        {log.hasPreviousImage ? "있음" : "없음"}
      </Descriptions.Item>
      <Descriptions.Item label="토큰 차감">
        {log.tokensCharged}
      </Descriptions.Item>
      <Descriptions.Item label="토큰 환불">
        {log.tokensRefunded}
      </Descriptions.Item>
      <Descriptions.Item label="텍스트 API(ms)">
        {log.textLatencyMs ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="이미지 API(ms)">
        {log.imageLatencyMs ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="전체 응답(ms)">
        {log.totalLatencyMs ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="에러 유형">
        {log.errorType ?? "없음"}
      </Descriptions.Item>
      <Descriptions.Item label="프롬프트" span={2}>
        <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {log.userMessage}
        </Text>
      </Descriptions.Item>
      {log.aiMessage && (
        <Descriptions.Item label="AI 응답" span={2}>
          <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.aiMessage}
          </Text>
        </Descriptions.Item>
      )}
      {log.designContext && (
        <Descriptions.Item label="디자인 컨텍스트" span={2}>
          <Text code style={{ fontSize: 11 }}>
            {JSON.stringify(log.designContext, null, 2)}
          </Text>
        </Descriptions.Item>
      )}
      {log.detectedDesign && (
        <Descriptions.Item label="감지된 디자인" span={2}>
          <Text code style={{ fontSize: 11 }}>
            {JSON.stringify(log.detectedDesign, null, 2)}
          </Text>
        </Descriptions.Item>
      )}
      <Descriptions.Item label="생성 시각" span={2}>
        {dayjs(log.createdAt).format("YYYY-MM-DD HH:mm:ss")}
      </Descriptions.Item>
    </Descriptions>
  );
}
