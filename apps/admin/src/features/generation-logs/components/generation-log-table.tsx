import { useState } from "react";
import {
  Table,
  Tag,
  Select,
  Space,
  Typography,
  Modal,
  Descriptions,
  List,
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
  hasMore: boolean;
  onPageChange: (page: number) => void;
  aiModel: string | null;
  onAiModelChange: (model: string | null) => void;
}

const renderGenerateImageStatus = (
  generateImage: boolean | null | undefined,
  imageGenerated: boolean,
) => {
  if (!generateImage) {
    return <Tag>미요청</Tag>;
  }

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
      render: (v: string) => {
        const color =
          v === "openai" ? "blue" : v === "gemini" ? "green" : "purple";

        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: "요청 유형",
      dataIndex: "requestType",
      key: "requestType",
      width: 120,
      render: (v: string | null) =>
        v === "analysis"
          ? "분석"
          : v === "render_standard"
            ? "렌더(표준)"
            : v === "render_high"
              ? "렌더(고품질)"
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
          onClick: () => setSelectedLog(record),
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
        {log.requestType === "analysis"
          ? "분석"
          : log.requestType === "render_standard"
            ? "렌더(표준)"
            : log.requestType === "render_high"
              ? "렌더(고품질)"
              : "-"}
      </Descriptions.Item>
      {log.phase && (
        <Descriptions.Item label="phase">
          {log.phase === "analysis" ? "분석" : "렌더"}
        </Descriptions.Item>
      )}
      {log.workflowId && (
        <Descriptions.Item label="workflow_id">
          <Text code style={{ fontSize: 11 }}>
            {log.workflowId}
          </Text>
        </Descriptions.Item>
      )}
      {log.parentWorkId && (
        <Descriptions.Item label="parent_work_id" span={2}>
          <Text code style={{ fontSize: 11 }}>
            {log.parentWorkId}
          </Text>
        </Descriptions.Item>
      )}
      <Descriptions.Item label="품질">{log.quality ?? "-"}</Descriptions.Item>
      <Descriptions.Item label="이미지 생성">
        {renderGenerateImageStatus(log.generateImage, log.imageGenerated)}
      </Descriptions.Item>
      {typeof log.eligibleForRender === "boolean" && (
        <Descriptions.Item label="렌더 가능">
          {log.eligibleForRender ? "가능" : "불가"}
        </Descriptions.Item>
      )}
      {log.eligibilityReason && (
        <Descriptions.Item label="렌더 판정 사유" span={2}>
          <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.eligibilityReason}
          </Text>
        </Descriptions.Item>
      )}
      <Descriptions.Item label="프롬프트 길이">
        {log.promptLength}자
      </Descriptions.Item>
      <Descriptions.Item label="첨부 파일" span={2}>
        {log.requestAttachments && log.requestAttachments.length > 0 ? (
          <List
            size="small"
            dataSource={log.requestAttachments}
            renderItem={(attachment) => (
              <List.Item>
                <Space size={8} wrap>
                  <Tag>{attachment.label}</Tag>
                  <Text>{attachment.fileName ?? "(파일명 없음)"}</Text>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          "-"
        )}
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
      {log.errorMessage && (
        <Descriptions.Item label="에러 메시지" span={2}>
          <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.errorMessage}
          </Text>
        </Descriptions.Item>
      )}
      <Descriptions.Item label="프롬프트" span={2}>
        <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {log.userMessage}
        </Text>
      </Descriptions.Item>
      {log.textPrompt && (
        <Descriptions.Item label="text_prompt" span={2}>
          <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.textPrompt}
          </Text>
        </Descriptions.Item>
      )}
      {log.imagePrompt && (
        <Descriptions.Item label="image_prompt" span={2}>
          <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.imagePrompt}
          </Text>
        </Descriptions.Item>
      )}
      {log.imageEditPrompt && (
        <Descriptions.Item label="image_edit_prompt" span={2}>
          <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.imageEditPrompt}
          </Text>
        </Descriptions.Item>
      )}
      {log.aiMessage && (
        <Descriptions.Item label="AI 응답" span={2}>
          <Text style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.aiMessage}
          </Text>
        </Descriptions.Item>
      )}
      {log.generatedImageUrl && (
        <Descriptions.Item label="생성된 이미지" span={2}>
          <img
            src={log.generatedImageUrl}
            alt="생성된 디자인"
            style={{ maxWidth: "100%", maxHeight: 400, objectFit: "contain" }}
          />
        </Descriptions.Item>
      )}
      {log.designContext && (
        <Descriptions.Item label="디자인 컨텍스트" span={2}>
          <Text code style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
            {JSON.stringify(log.designContext, null, 2)}
          </Text>
        </Descriptions.Item>
      )}
      {log.detectedDesign && (
        <Descriptions.Item label="감지된 디자인" span={2}>
          <Text code style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
            {JSON.stringify(log.detectedDesign, null, 2)}
          </Text>
        </Descriptions.Item>
      )}
      {log.normalizedDesign && (
        <Descriptions.Item label="정규화된 디자인" span={2}>
          <Text code style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
            {JSON.stringify(log.normalizedDesign, null, 2)}
          </Text>
        </Descriptions.Item>
      )}
      {Array.isArray(log.missingRequirements) &&
        log.missingRequirements.length > 0 && (
          <Descriptions.Item label="누락 요구사항" span={2}>
            <Text code style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
              {JSON.stringify(log.missingRequirements, null, 2)}
            </Text>
          </Descriptions.Item>
        )}
      <Descriptions.Item label="생성 시각" span={2}>
        {dayjs(log.createdAt).format("YYYY-MM-DD HH:mm:ss")}
      </Descriptions.Item>
    </Descriptions>
  );
}
