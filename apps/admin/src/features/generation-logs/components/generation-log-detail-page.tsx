import { useState } from "react";
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Image,
  Row,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useGenerationLogDetailQuery } from "@/features/generation-logs/api/generation-logs-query";
import { GenerationLogArtifactTimeline } from "@/features/generation-logs/components/generation-log-artifact-timeline";
import { modelColor, requestTypeLabel } from "@/features/generation-logs/utils";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const { Text } = Typography;

function StickyBar({
  log,
  onBack,
}: {
  log: AdminGenerationLogItem;
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

function ArtifactSection({ log }: { log: AdminGenerationLogItem }) {
  return (
    <Card title="아티팩트 타임라인" size="small" style={{ marginBottom: 16 }}>
      {log.workflowId ? (
        <GenerationLogArtifactTimeline workflowId={log.workflowId} />
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

export function GenerationLogDetailPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const {
    data: log,
    isLoading,
    errorMessage,
  } = useGenerationLogDetailQuery(id);

  if (isLoading) {
    return <Spin style={{ display: "block", margin: "80px auto" }} />;
  }

  if (errorMessage || !log) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          showIcon
          message="로그를 불러올 수 없습니다"
          description={errorMessage ?? "해당 ID의 로그가 존재하지 않습니다."}
        />
      </div>
    );
  }

  return (
    <>
      <StickyBar log={log} onBack={() => navigate("/generation-logs")} />
      <div style={{ padding: 24 }}>
        <BasicInfoSection log={log} />
        <GeneratedImageSection log={log} />
        <ArtifactSection log={log} />
        <PromptSection log={log} />
        <DesignContextSection log={log} />
      </div>
    </>
  );
}
