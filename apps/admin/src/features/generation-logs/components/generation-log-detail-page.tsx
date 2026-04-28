import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Image,
  List,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  useGenerationLogDetailQuery,
  useGenerationLogArtifactsQuery,
  useGenerationWorkflowLogsQuery,
} from "@/features/generation-logs/api/generation-logs-query";
import {
  isArtifactWarningMessage,
  modelColor,
  requestTypeLabel,
} from "@/features/generation-logs/utils";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";
import { formatDateTimeSeconds } from "@/utils/format-date-time";

const { Text } = Typography;

type WorkflowStepListVariant = "chip" | "card";
const INPUT_ARTIFACT_TYPE_PRIORITY = [
  "source_input",
  "input_image",
  "attached_image",
  "reference_image",
  "ci_image",
  "previous_image",
  "repeat_tile",
  "accent_tile",
] as const;

interface WorkflowStepListProps {
  workflowLogs: AdminGenerationLogItem[];
  activeLogId: string;
  onSelectLog: (logId: string) => void;
  variant: WorkflowStepListVariant;
}

function WorkflowStepList({
  workflowLogs,
  activeLogId,
  onSelectLog,
  variant,
}: WorkflowStepListProps) {
  if (workflowLogs.length <= 1) {
    return null;
  }

  if (variant === "chip") {
    return (
      <Space wrap size={8} style={{ marginTop: 10 }}>
        {workflowLogs.map((workflowLog) => (
          <Button
            key={workflowLog.id}
            type={workflowLog.id === activeLogId ? "primary" : "default"}
            size="small"
            onClick={() => onSelectLog(workflowLog.id)}
          >
            {requestTypeLabel(workflowLog.requestType)} · {workflowLog.aiModel}
          </Button>
        ))}
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      {workflowLogs.map((workflowLog) => {
        const isActive = workflowLog.id === activeLogId;
        return (
          <button
            key={workflowLog.id}
            type="button"
            onClick={() => onSelectLog(workflowLog.id)}
            style={{
              width: "100%",
              textAlign: "left",
              borderRadius: 8,
              border: isActive ? "1px solid #1677ff" : "1px solid #f0f0f0",
              background: isActive ? "#f0f7ff" : "#fff",
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            <Space wrap size={8}>
              <Tag color={modelColor(workflowLog.aiModel)}>
                {workflowLog.aiModel}
              </Tag>
              <Tag>{requestTypeLabel(workflowLog.requestType)}</Tag>
              {workflowLog.errorType ? (
                <Tag color="error">{workflowLog.errorType}</Tag>
              ) : (
                <Tag color="success">success</Tag>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDateTimeSeconds(workflowLog.createdAt)}
              </Text>
              <Text code style={{ fontSize: 11 }}>
                {workflowLog.workId}
              </Text>
            </Space>
          </button>
        );
      })}
    </Space>
  );
}

function StickyBar({
  log,
  workflowLogs,
  activeLogId,
  onSelectLog,
  onBack,
}: {
  log: AdminGenerationLogItem;
  workflowLogs: AdminGenerationLogItem[];
  activeLogId: string;
  onSelectLog: (logId: string) => void;
  onBack: () => void;
}) {
  const netTokensCharged = Math.max(0, log.tokensCharged - log.tokensRefunded);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#fff",
        border: "1px solid #f0f0f0",
        borderRadius: 0,
        margin: 0,
        padding: "10px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <Button
          aria-label="AI 생성 로그 목록으로 돌아가기"
          type="link"
          size="small"
          style={{ padding: 0, fontSize: 13, cursor: "pointer" }}
          onClick={onBack}
        >
          ← AI 생성 로그
        </Button>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {" "}
          / {dayjs(log.createdAt).format("MM-DD HH:mm:ss")} · {log.aiModel} ·{" "}
          {requestTypeLabel(log.requestType)}
        </Text>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Tag color={modelColor(log.aiModel)}>{log.aiModel}</Tag>
        <Tag>{requestTypeLabel(log.requestType)}</Tag>
        <Text type="secondary" style={{ fontSize: 13 }}>
          토큰 <strong>{netTokensCharged}</strong>
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          응답{" "}
          <strong>
            {log.totalLatencyMs != null ? `${log.totalLatencyMs}ms` : "—"}
          </strong>
        </Text>
        {log.errorType ? (
          <Tag color="error">{log.errorType}</Tag>
        ) : (
          <Tag color="success">성공</Tag>
        )}
        {log.workflowId && (
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              marginLeft: "auto",
              fontFamily: "monospace",
            }}
          >
            workflow: {log.workflowId}
          </Text>
        )}
      </div>
      <WorkflowStepList
        workflowLogs={workflowLogs}
        activeLogId={activeLogId}
        onSelectLog={onSelectLog}
        variant="chip"
      />
    </div>
  );
}

function GeneratedImageSection({ log }: { log: AdminGenerationLogItem }) {
  const generatedImages = [
    {
      label: "generated_image_url",
      url: log.generatedImageUrl,
      workId: log.workId,
    },
    {
      label: "repeat_tile_url",
      url: log.repeatTileUrl,
      workId: log.repeatTileWorkId,
    },
    {
      label: "accent_tile_url",
      url: log.accentTileUrl,
      workId: log.accentTileWorkId,
    },
  ].filter(
    (item): item is { label: string; url: string; workId: string | null } =>
      Boolean(item.url),
  );

  if (generatedImages.length === 0) {
    return (
      <Card title="생성된 이미지" size="small" style={{ marginBottom: 16 }}>
        <div
          style={{
            background: "#f5f5f5",
            borderRadius: 8,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#bbb",
            border: "1px dashed #d9d9d9",
          }}
        >
          이미지 없음 ({requestTypeLabel(log.requestType)} 단계)
        </div>
      </Card>
    );
  }

  return (
    <Card title="생성된 이미지" size="small" style={{ marginBottom: 16 }}>
      <List
        grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
        dataSource={generatedImages}
        renderItem={(item) => (
          <List.Item>
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Image
                src={item.url}
                alt={item.label}
                style={{
                  maxWidth: "100%",
                  maxHeight: 360,
                  objectFit: "contain",
                  borderRadius: 6,
                }}
              />
              <Text strong style={{ fontSize: 12 }}>
                {item.label}
              </Text>
              <Text code style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
                {item.workId ?? "-"}
              </Text>
              <Text
                type="secondary"
                style={{ fontSize: 11, overflowWrap: "anywhere" }}
              >
                {item.url}
              </Text>
            </Space>
          </List.Item>
        )}
      />
    </Card>
  );
}

function getInputArtifactPriority(artifactType: string): number {
  const index = INPUT_ARTIFACT_TYPE_PRIORITY.findIndex(
    (candidate) => candidate === artifactType,
  );
  return index === -1 ? INPUT_ARTIFACT_TYPE_PRIORITY.length : index;
}

function InputImageSection({ log }: { log: AdminGenerationLogItem }) {
  const { data: artifacts, isLoading } = useGenerationLogArtifactsQuery({
    workflowId: log.workflowId,
  });

  const inputArtifacts = useMemo(() => {
    return artifacts
      .filter((artifact) => artifact.imageUrl)
      .sort((left, right) => {
        const priorityDiff =
          getInputArtifactPriority(left.artifactType) -
          getInputArtifactPriority(right.artifactType);
        if (priorityDiff !== 0) return priorityDiff;
        return left.artifactType.localeCompare(right.artifactType);
      });
  }, [artifacts]);

  const hasImageAttachment = log.requestAttachments?.some(
    (attachment) => attachment.type === "image",
  );

  if (!hasImageAttachment && inputArtifacts.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card title="입력 이미지" size="small" style={{ marginBottom: 16 }}>
      {isLoading ? (
        <Spin />
      ) : inputArtifacts.length > 0 ? (
        <List
          grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
          dataSource={inputArtifacts}
          renderItem={(artifact) => (
            <List.Item>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Image
                  src={artifact.imageUrl ?? undefined}
                  alt={`${artifact.artifactType} 입력 이미지`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: 320,
                    objectFit: "contain",
                    borderRadius: 6,
                  }}
                />
                <Space wrap size={6}>
                  <Tag>{artifact.artifactType}</Tag>
                  <Tag
                    color={
                      artifact.status === "success" ? "success" : "warning"
                    }
                  >
                    {artifact.status}
                  </Tag>
                </Space>
                <Text code style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
                  {artifact.sourceWorkId ?? artifact.id ?? "-"}
                </Text>
                <Text
                  type="secondary"
                  style={{ fontSize: 11, overflowWrap: "anywhere" }}
                >
                  {artifact.imageUrl}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      ) : hasImageAttachment ? (
        <Alert
          type="warning"
          showIcon
          message="첨부 이미지는 있었지만 저장된 원본 이미지가 없습니다"
          description="당시 source artifact 저장이 실패했거나, 로그에는 파일명만 남고 실제 이미지 URL은 저장되지 않았습니다."
        />
      ) : (
        <Alert type="info" showIcon message="입력 이미지가 없습니다" />
      )}
    </Card>
  );
}

function AttachedImageSection({ log }: { log: AdminGenerationLogItem }) {
  const imageAttachments =
    log.requestAttachments?.filter(
      (attachment) => attachment.type === "image",
    ) ?? [];

  if (imageAttachments.length === 0) {
    return null;
  }

  return (
    <Card title="첨부 이미지" size="small" style={{ marginBottom: 16 }}>
      <List
        grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
        dataSource={imageAttachments}
        renderItem={(attachment) => {
          const isHttpsUrl = attachment.value.startsWith("https://");

          return (
            <List.Item>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                {isHttpsUrl ? (
                  <Image
                    src={attachment.value}
                    alt={attachment.label}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 320,
                      objectFit: "contain",
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message="첨부 이미지 URL이 저장되지 않았습니다"
                    description={attachment.value}
                  />
                )}
                <Text strong style={{ fontSize: 12 }}>
                  {attachment.label}
                </Text>
                {attachment.fileName && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {attachment.fileName}
                  </Text>
                )}
                {isHttpsUrl && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, overflowWrap: "anywhere" }}
                  >
                    {attachment.value}
                  </Text>
                )}
              </Space>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}

function ExpandableText({
  label,
  content,
}: {
  label: string;
  content: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 300;
  const isLong = content.length > LIMIT;
  const displayed =
    expanded || !isLong ? content : content.slice(0, LIMIT) + "…";

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "#999",
          marginBottom: 5,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: "#fafafa",
          borderRadius: 6,
          border: "1px solid #f0f0f0",
          padding: "8px 10px",
          fontSize: 12,
          color: "#374151",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}
      >
        {displayed}
      </div>
      {isLong && (
        <Button
          aria-label={expanded ? `${label} 접기` : `${label} 더 보기`}
          type="link"
          size="small"
          style={{ padding: 0, fontSize: 11, cursor: "pointer" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "접기" : "더 보기"}
        </Button>
      )}
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return null;
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
        {label}
      </div>
      <Text
        code
        style={{
          fontSize: 11,
          whiteSpace: "pre-wrap",
          display: "block",
          maxHeight: 520,
          overflow: "auto",
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Text>
    </div>
  );
}

function buildLoggedRequestSnapshot(log: AdminGenerationLogItem) {
  return {
    route: log.route,
    userMessage: log.userMessage,
    workflowId: log.workflowId ?? null,
    workId: log.workId,
    parentWorkId: log.parentWorkId ?? null,
    requestAttachments: log.requestAttachments,
    designContext: log.designContext,
    normalizedDesign: log.normalizedDesign ?? null,
    detectedDesign: log.detectedDesign,
    imagePrompt: log.imagePrompt ?? null,
  };
}

function buildLoggedResultSnapshot(log: AdminGenerationLogItem) {
  return {
    imageGenerated: log.imageGenerated,
    generatedImageUrl: log.generatedImageUrl,
    repeatTileUrl: log.repeatTileUrl,
    repeatTileWorkId: log.repeatTileWorkId,
    accentTileUrl: log.accentTileUrl,
    accentTileWorkId: log.accentTileWorkId,
    patternType: log.patternType,
    fabricType: log.fabricType,
    tileRole: log.tileRole,
    pairedTileWorkId: log.pairedTileWorkId,
    accentLayoutJson: log.accentLayoutJson,
  };
}

function RequestOptionsSection({ log }: { log: AdminGenerationLogItem }) {
  const hasOptions =
    (log.requestAttachments?.length ?? 0) > 0 ||
    log.designContext ||
    log.normalizedDesign ||
    log.patternType ||
    log.fabricType ||
    log.accentLayoutJson;

  if (!hasOptions) return null;

  return (
    <Card title="사용자 선택 옵션" size="small" style={{ marginBottom: 16 }}>
      {log.requestAttachments && (
        <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
          {log.requestAttachments.map((attachment, index) => (
            <Tag key={`${attachment.type}-${attachment.value}-${index}`}>
              {attachment.label}: {attachment.value}
              {attachment.fileName ? ` (${attachment.fileName})` : ""}
            </Tag>
          ))}
        </Space>
      )}
      <Descriptions
        column={3}
        size="small"
        bordered
        style={{ marginBottom: 12 }}
      >
        <Descriptions.Item label="pattern_type">
          {log.patternType ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="fabric_type">
          {log.fabricType ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="tile_role">
          {log.tileRole ?? "-"}
        </Descriptions.Item>
      </Descriptions>
      {log.designContext && (
        <JsonBlock label="design_context" value={log.designContext} />
      )}
      {log.normalizedDesign && (
        <JsonBlock label="normalized_design" value={log.normalizedDesign} />
      )}
      {log.accentLayoutJson && (
        <JsonBlock label="accent_layout_json" value={log.accentLayoutJson} />
      )}
    </Card>
  );
}

function ExecutionLogSection({ log }: { log: AdminGenerationLogItem }) {
  const isArtifactWarning = isArtifactWarningMessage(log.errorMessage);

  return (
    <Card
      title="기본 정보 & API 전송/실행 로그"
      size="small"
      style={{ marginBottom: 16 }}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="로그에 저장된 실제 필드만 표시합니다"
        description="Edge Function body 전체 스냅샷은 별도 저장하지 않으므로, 저장되지 않은 previous* 요청값은 표시하지 않습니다."
      />
      <Descriptions
        column={3}
        size="small"
        bordered
        style={{ marginBottom: 12 }}
      >
        <Descriptions.Item label="created_at">
          {formatDateTimeSeconds(log.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="conversation_turn">
          {log.conversationTurn}
        </Descriptions.Item>
        <Descriptions.Item label="prompt_length">
          {log.promptLength}자
        </Descriptions.Item>
        <Descriptions.Item label="result">
          {!log.generateImage ? "미요청" : log.imageGenerated ? "성공" : "실패"}
        </Descriptions.Item>
        <Descriptions.Item label="workflow_id">
          {log.workflowId ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="work_id">{log.workId}</Descriptions.Item>
        <Descriptions.Item label="parent_work_id">
          {log.parentWorkId ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="route">{log.route ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="request_type">
          {log.requestType ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="quality">
          {log.quality ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="latency">
          total {log.totalLatencyMs ?? "-"}ms / text {log.textLatencyMs ?? "-"}
          ms / image {log.imageLatencyMs ?? "-"}ms
        </Descriptions.Item>
        <Descriptions.Item label="tokens">
          charged {log.tokensCharged} / refunded {log.tokensRefunded}
        </Descriptions.Item>
        <Descriptions.Item label="error">
          {log.errorType ?? "없음"}
        </Descriptions.Item>
      </Descriptions>
      {log.errorMessage && (
        <Alert
          type={isArtifactWarning ? "warning" : "error"}
          message={log.errorMessage}
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}
      <JsonBlock
        label="logged_request_fields"
        value={buildLoggedRequestSnapshot(log)}
      />
      <JsonBlock
        label="logged_result_fields"
        value={buildLoggedResultSnapshot(log)}
      />
    </Card>
  );
}

function PromptSection({ log }: { log: AdminGenerationLogItem }) {
  return (
    <Card title="프롬프트 & AI 응답" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <ExpandableText label="사용자 프롬프트" content={log.userMessage} />
          {log.imagePrompt && (
            <div style={{ marginTop: 10 }}>
              <ExpandableText label="image_prompt" content={log.imagePrompt} />
            </div>
          )}
        </Col>
        <Col xs={24} md={12}>
          {log.aiMessage && (
            <ExpandableText label="AI 응답" content={log.aiMessage} />
          )}
        </Col>
      </Row>
    </Card>
  );
}

function getWorkflowPhaseRank(log: AdminGenerationLogItem): number {
  if (log.phase === "render") return 0;
  return 1;
}

function WorkflowLogsSection({
  workflowLogs,
  activeLogId,
  onSelectLog,
}: {
  workflowLogs: AdminGenerationLogItem[];
  activeLogId: string;
  onSelectLog: (logId: string) => void;
}) {
  if (workflowLogs.length <= 1) {
    return null;
  }

  return (
    <Card title="워크플로우 단계" size="small" style={{ marginBottom: 16 }}>
      <WorkflowStepList
        workflowLogs={workflowLogs}
        activeLogId={activeLogId}
        onSelectLog={onSelectLog}
        variant="card"
      />
    </Card>
  );
}

export function GenerationLogDetailPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const {
    data: requestedLog,
    isLoading: isDetailLoading,
    errorMessage: detailErrorMessage,
  } = useGenerationLogDetailQuery(id);
  const { data: workflowLogs, isLoading: isWorkflowLoading } =
    useGenerationWorkflowLogsQuery(requestedLog?.workflowId ?? "");
  const [logOverride, setLogOverride] = useState<{
    overrideForId: string;
    logId: string;
  } | null>(null);
  const activeLogId =
    logOverride?.overrideForId === id ? logOverride.logId : id;
  const selectLog = (logId: string) =>
    setLogOverride({ overrideForId: id, logId });

  const orderedWorkflowLogs = useMemo(
    () =>
      [...workflowLogs].sort((left, right) => {
        const rankDiff =
          getWorkflowPhaseRank(left) - getWorkflowPhaseRank(right);
        if (rankDiff !== 0) {
          return rankDiff;
        }

        return (
          dayjs(right.createdAt).valueOf() - dayjs(left.createdAt).valueOf()
        );
      }),
    [workflowLogs],
  );

  const activeLog = useMemo(() => {
    if (orderedWorkflowLogs.length === 0) {
      return requestedLog;
    }

    return (
      orderedWorkflowLogs.find((log) => log.id === activeLogId) ??
      orderedWorkflowLogs.find((log) => log.id === id) ??
      orderedWorkflowLogs[0] ??
      requestedLog
    );
  }, [activeLogId, id, orderedWorkflowLogs, requestedLog]);

  if (isDetailLoading || (requestedLog?.workflowId && isWorkflowLoading)) {
    return <Spin style={{ display: "block", margin: "80px auto" }} />;
  }

  if (detailErrorMessage || !activeLog) {
    return (
      <div style={{ padding: "0 24px 24px" }}>
        <Alert
          type="error"
          showIcon
          message="로그를 불러올 수 없습니다"
          description={
            detailErrorMessage ?? "해당 ID의 로그가 존재하지 않습니다."
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <StickyBar
        log={activeLog}
        workflowLogs={orderedWorkflowLogs}
        activeLogId={activeLog.id}
        onSelectLog={selectLog}
        onBack={() => navigate("/generation-logs")}
      />
      <div style={{ padding: 0 }}>
        <WorkflowLogsSection
          workflowLogs={orderedWorkflowLogs}
          activeLogId={activeLog.id}
          onSelectLog={selectLog}
        />
        <ExecutionLogSection log={activeLog} />
        <AttachedImageSection log={activeLog} />
        <InputImageSection log={activeLog} />
        <GeneratedImageSection log={activeLog} />
        <RequestOptionsSection log={activeLog} />
        <PromptSection log={activeLog} />
      </div>
    </div>
  );
}
