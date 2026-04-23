import { useMemo } from "react";
import {
  Card,
  Empty,
  Alert,
  Image,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useGenerationLogArtifactsQuery } from "@/features/generation-logs/api/generation-logs-query";
import type {
  AdminGenerationArtifactItem,
  AdminGenerationArtifactPhase,
} from "@/features/generation-logs/types/admin-generation-artifact";

const { Text, Title } = Typography;

type PhaseBucket = AdminGenerationArtifactPhase | "unclassified";

const PHASE_ORDER: readonly PhaseBucket[] = [
  "analysis",
  "prep",
  "render",
  "unclassified",
];

function getPhaseLabel(phase: PhaseBucket): string {
  return phase === "analysis"
    ? "분석"
    : phase === "prep"
      ? "보정"
      : phase === "render"
        ? "렌더"
        : "미분류";
}

function getStatusColor(status: AdminGenerationArtifactItem["status"]): string {
  if (status === "success") return "success";
  if (status === "partial") return "warning";
  return "error";
}

function stringifyMetaValue(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function summarizeMeta(meta: Record<string, unknown>): string | null {
  if (Object.keys(meta).length === 0) {
    return null;
  }

  const summaryItems = Object.entries(meta)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${stringifyMetaValue(value)}`);

  return summaryItems.length > 0 ? summaryItems.join(" · ") : null;
}

function getArtifactSourceLabel(artifact: AdminGenerationArtifactItem): string {
  if (artifact.sourceWorkId) {
    return artifact.sourceWorkId;
  }

  if (artifact.parentArtifactId) {
    return artifact.parentArtifactId;
  }

  return "-";
}

function getArtifactSizeLabel(artifact: AdminGenerationArtifactItem): string {
  const width = artifact.imageWidth;
  const height = artifact.imageHeight;

  if (width == null || height == null) {
    return "-";
  }

  return `${width}×${height}`;
}

function getFileSizeLabel(bytes: number | null): string {
  if (bytes == null) return "-";
  return `${bytes.toLocaleString()}B`;
}

function ArtifactTimelineEntry({
  artifact,
}: {
  artifact: AdminGenerationArtifactItem;
}) {
  const metaSummary = summarizeMeta(artifact.meta);

  return (
    <Card size="small" styles={{ body: { padding: 10 } }}>
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Space wrap size={8}>
            <Tag color={getStatusColor(artifact.status)}>{artifact.status}</Tag>
            <Text strong style={{ fontSize: 12 }}>
              {artifact.artifactType}
            </Text>
          </Space>

          <Text type="secondary" style={{ fontSize: 11 }}>
            아티팩트 ID: {artifact.id}
          </Text>
        </Space>

        {artifact.imageUrl ? (
          <Image
            src={artifact.imageUrl}
            alt={`${artifact.artifactType} artifact`}
            width={140}
            style={{ borderRadius: 6, objectFit: "cover" }}
            fallback=""
          />
        ) : (
          <div
            style={{
              width: 140,
              height: 90,
              borderRadius: 6,
              border: "1px dashed #d9d9d9",
              color: "#999",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            이미지 없음
          </div>
        )}

        <Text type="secondary" style={{ fontSize: 11 }}>
          생성 시각:{" "}
          {artifact.createdAt
            ? dayjs(artifact.createdAt).format("YYYY-MM-DD HH:mm:ss")
            : "-"}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          소스: {getArtifactSourceLabel(artifact)}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          크기: {artifact.storageProvider} / {getArtifactSizeLabel(artifact)} /{" "}
          {artifact.mimeType ?? "-"} /{" "}
          {getFileSizeLabel(artifact.fileSizeBytes)}
        </Text>

        {metaSummary ? (
          <Text type="secondary" style={{ fontSize: 11 }}>
            메타: {metaSummary}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>
            메타: 없음
          </Text>
        )}
      </Space>
    </Card>
  );
}

export function GenerationLogArtifactTimeline({
  workflowId,
  logErrorMessage,
}: {
  workflowId?: string | null;
  logErrorMessage?: string | null;
}) {
  const {
    data: artifacts,
    isLoading,
    errorMessage,
  } = useGenerationLogArtifactsQuery({
    workflowId,
  });

  const groupedArtifacts = useMemo(() => {
    const grouped: Record<PhaseBucket, AdminGenerationArtifactItem[]> = {
      analysis: [],
      prep: [],
      render: [],
      unclassified: [],
    };

    artifacts.forEach((artifact) => {
      const key = artifact.phase ?? "unclassified";
      grouped[key].push(artifact);
    });

    return grouped;
  }, [artifacts]);

  if (isLoading) {
    return <Spin style={{ marginTop: 8 }} />;
  }

  if (errorMessage) {
    return (
      <>
        <Title level={5}>생성 아티팩트 타임라인</Title>
        <Alert
          type="error"
          showIcon
          message="아티팩트를 불러오지 못했습니다"
          description={errorMessage}
        />
      </>
    );
  }

  const hasArtifacts = artifacts.length > 0;
  const hasArtifactWarnings =
    typeof logErrorMessage === "string" &&
    logErrorMessage.includes("artifact_warnings:");

  if (!hasArtifacts) {
    return (
      <>
        <Title level={5}>생성 아티팩트 타임라인</Title>
        {hasArtifactWarnings ? (
          <Alert
            type="warning"
            showIcon
            message="아티팩트 저장이 실패해 타임라인이 비어 있습니다"
            description={logErrorMessage}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="워크플로우 아티팩트가 없습니다"
          />
        )}
      </>
    );
  }

  return (
    <>
      <Title level={5}>생성 아티팩트 타임라인</Title>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {PHASE_ORDER.filter((phase) => groupedArtifacts[phase].length > 0).map(
          (phase) => (
            <div key={phase}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                {getPhaseLabel(phase)} ({groupedArtifacts[phase].length})
              </Text>
              <List
                grid={{ gutter: 12, xs: 1, sm: 2, md: 3, lg: 3 }}
                dataSource={groupedArtifacts[phase]}
                renderItem={(artifact) => (
                  <List.Item>
                    <ArtifactTimelineEntry artifact={artifact} />
                  </List.Item>
                )}
                split={false}
              />
            </div>
          ),
        )}
      </Space>
    </>
  );
}
