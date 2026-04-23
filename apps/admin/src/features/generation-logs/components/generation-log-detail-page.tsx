import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Image,
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
import { GenerationLogArtifactTimeline } from "@/features/generation-logs/components/generation-log-artifact-timeline";
import { modelColor, requestTypeLabel } from "@/features/generation-logs/utils";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const { Text } = Typography;

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
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#fff",
        borderBottom: "1px solid #f0f0f0",
        padding: "10px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <Text
          type="secondary"
          style={{ cursor: "pointer", fontSize: 13 }}
          onClick={onBack}
        >
          ← AI 생성 로그
        </Text>
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
          토큰 <strong>{log.tokensCharged - log.tokensRefunded}</strong>
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
      {workflowLogs.length > 1 ? (
        <Space wrap size={8} style={{ marginTop: 10 }}>
          {workflowLogs.map((workflowLog) => {
            const selected = workflowLog.id === activeLogId;
            const label = `${requestTypeLabel(workflowLog.requestType)} · ${workflowLog.aiModel}`;
            return (
              <Button
                key={workflowLog.id}
                type={selected ? "primary" : "default"}
                size="small"
                onClick={() => onSelectLog(workflowLog.id)}
              >
                {label}
              </Button>
            );
          })}
        </Space>
      ) : null}
    </div>
  );
}

function BasicInfoSection({ log }: { log: AdminGenerationLogItem }) {
  return (
    <Card title="기본 정보" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[8, 8]}>
        {[
          { label: "CI 이미지", value: log.hasCiImage ? "있음" : "없음" },
          {
            label: "레퍼런스 이미지",
            value: log.hasReferenceImage ? "있음" : "없음",
          },
          {
            label: "이전 이미지",
            value: log.hasPreviousImage ? "있음" : "없음",
          },
          { label: "대화 턴", value: String(log.conversationTurn) },
          { label: "프롬프트 길이", value: `${log.promptLength}자` },
          {
            label: "이미지 생성",
            value: !log.generateImage
              ? "미요청"
              : log.imageGenerated
                ? "성공"
                : "실패",
          },
          {
            label: "텍스트 API",
            value: log.textLatencyMs != null ? `${log.textLatencyMs}ms` : "—",
          },
          {
            label: "이미지 API",
            value: log.imageLatencyMs != null ? `${log.imageLatencyMs}ms` : "—",
          },
        ].map(({ label, value }) => (
          <Col key={label} xs={12} sm={6}>
            <div
              style={{
                background: "#fafafa",
                borderRadius: 6,
                padding: "8px 12px",
                border: "1px solid #f0f0f0",
              }}
            >
              <div style={{ fontSize: 11, color: "#999", marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>
                {value}
              </div>
            </div>
          </Col>
        ))}
      </Row>
      {log.errorMessage && (
        <Alert
          type="error"
          message={log.errorMessage}
          style={{ marginTop: 10 }}
          showIcon
        />
      )}
    </Card>
  );
}

function GeneratedImageSection({ log }: { log: AdminGenerationLogItem }) {
  if (!log.generatedImageUrl) {
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
      <Image
        src={log.generatedImageUrl}
        alt="생성된 디자인"
        style={{ maxWidth: "100%", maxHeight: 500, objectFit: "contain" }}
      />
    </Card>
  );
}

function InputImageSection({ log }: { log: AdminGenerationLogItem }) {
  const { data: artifacts, isLoading } = useGenerationLogArtifactsQuery({
    workflowId: log.workflowId,
  });

  const inputArtifact = useMemo(
    () =>
      artifacts.find((artifact) =>
        [
          "source_input",
          "source_original",
          "prepared_source",
          "fal_input_preview",
          "inpaint_base",
          "upscaled_reference",
          "control_image",
        ].includes(artifact.artifactType),
      ) ?? null,
    [artifacts],
  );

  const hasImageAttachment = log.requestAttachments?.some(
    (attachment) => attachment.type === "image",
  );

  if (!hasImageAttachment && !inputArtifact && !isLoading) {
    return null;
  }

  return (
    <Card title="입력 이미지" size="small" style={{ marginBottom: 16 }}>
      {isLoading ? (
        <Spin />
      ) : inputArtifact?.imageUrl ? (
        <Image
          src={inputArtifact.imageUrl}
          alt="입력 이미지"
          style={{ maxWidth: "100%", maxHeight: 400, objectFit: "contain" }}
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

function ArtifactSection({ log }: { log: AdminGenerationLogItem }) {
  return (
    <Card title="아티팩트 타임라인" size="small" style={{ marginBottom: 16 }}>
      {log.workflowId ? (
        <GenerationLogArtifactTimeline
          workflowId={log.workflowId}
          logErrorMessage={log.errorMessage}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message="이 로그는 workflow와 연결되지 않아 아티팩트 추적이 불가합니다."
          description="openai / gemini 단일 렌더 로그는 workflow_id가 없습니다."
        />
      )}
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
        <Text
          style={{ fontSize: 11, color: "#1677ff", cursor: "pointer" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "접기" : "더 보기"}
        </Text>
      )}
    </div>
  );
}

function PromptSection({ log }: { log: AdminGenerationLogItem }) {
  return (
    <Card title="프롬프트 & AI 응답" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <ExpandableText label="사용자 프롬프트" content={log.userMessage} />
          {log.textPrompt && (
            <div style={{ marginTop: 10 }}>
              <ExpandableText label="text_prompt" content={log.textPrompt} />
            </div>
          )}
          {log.imagePrompt && (
            <div style={{ marginTop: 10 }}>
              <ExpandableText label="image_prompt" content={log.imagePrompt} />
            </div>
          )}
          {log.imageEditPrompt && (
            <div style={{ marginTop: 10 }}>
              <ExpandableText
                label="image_edit_prompt"
                content={log.imageEditPrompt}
              />
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

function DesignContextSection({ log }: { log: AdminGenerationLogItem }) {
  const hasContent =
    log.designContext ||
    log.detectedDesign ||
    log.normalizedDesign ||
    (Array.isArray(log.missingRequirements) &&
      log.missingRequirements.length > 0) ||
    log.eligibilityReason;

  if (!hasContent) return null;

  return (
    <Card
      title="디자인 컨텍스트 & 감지 결과"
      size="small"
      style={{ marginBottom: 16 }}
    >
      {log.designContext && (
        <Descriptions
          column={4}
          size="small"
          bordered
          style={{ marginBottom: 10 }}
        >
          {Object.entries(log.designContext as Record<string, unknown>)
            .filter(([, v]) => v != null)
            .map(([k, v]) => (
              <Descriptions.Item key={k} label={k}>
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </Descriptions.Item>
            ))}
        </Descriptions>
      )}
      {log.eligibilityReason && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
            렌더 판정 사유
          </div>
          <div
            style={{
              background: "#fafafa",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {log.eligibilityReason}
          </div>
        </div>
      )}
      {log.detectedDesign && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
            감지된 디자인 (raw)
          </div>
          <Text
            code
            style={{ fontSize: 11, whiteSpace: "pre-wrap", display: "block" }}
          >
            {JSON.stringify(log.detectedDesign, null, 2)}
          </Text>
        </div>
      )}
    </Card>
  );
}

function getWorkflowPhaseRank(log: AdminGenerationLogItem): number {
  if (log.phase === "render") return 0;
  if (log.phase === "prep") return 1;
  if (log.phase === "analysis") return 2;
  return 3;
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
                  {dayjs(workflowLog.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                </Text>
                <Text code style={{ fontSize: 11 }}>
                  {workflowLog.workId}
                </Text>
              </Space>
            </button>
          );
        })}
      </Space>
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
  const [activeLogId, setActiveLogId] = useState(id);

  useEffect(() => {
    setActiveLogId(id);
  }, [id]);

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
      <div style={{ padding: 24 }}>
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
    <>
      <StickyBar
        log={activeLog}
        workflowLogs={orderedWorkflowLogs}
        activeLogId={activeLog.id}
        onSelectLog={setActiveLogId}
        onBack={() => navigate("/generation-logs")}
      />
      <div style={{ padding: 24 }}>
        <WorkflowLogsSection
          workflowLogs={orderedWorkflowLogs}
          activeLogId={activeLog.id}
          onSelectLog={setActiveLogId}
        />
        <BasicInfoSection log={activeLog} />
        <InputImageSection log={activeLog} />
        <GeneratedImageSection log={activeLog} />
        <ArtifactSection log={activeLog} />
        <PromptSection log={activeLog} />
        <DesignContextSection log={activeLog} />
      </div>
    </>
  );
}
