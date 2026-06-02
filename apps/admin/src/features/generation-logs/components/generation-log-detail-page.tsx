import { Text } from "seed-design/ui/text";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useGenerationLogDetailQuery,
  useGenerationWorkflowLogsQuery,
} from "@/features/generation-logs/api/generation-logs-query";
import { requestTypeLabel } from "@/features/generation-logs/utils";
import { hasJsonBlockContent } from "@/features/generation-logs/utils/json-block";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";
import { formatDateTimeSeconds } from "@/utils/format-date-time";
import "./generation-logs.css";

interface GeneratedImageItem {
  label: string;
  url: string | null;
  workId: string;
  logId: string;
  status: "success" | "error";
  totalLatencyMs: number | null;
}

function statusTone(status: "success" | "error") {
  return status === "success" ? "positive" : "critical";
}

function DetailHeader({ log }: { log: AdminGenerationLogItem }) {
  const netTokensCharged = Math.max(0, log.tokensCharged - log.tokensRefunded);

  return (
    <header className="generationLogHeader">
      <div className="generationLogTitleGroup">
        <Text as="p" textStyle="t2Regular" className="generationLogBreadcrumb">
          AI 생성 로그 / 상세
        </Text>
        <Text as="h1" textStyle="t8Bold" className="generationLogTitle">
          AI 생성 로그 상세
        </Text>
        <Text as="p" textStyle="t4Regular" className="generationLogDescription">
          생성 요청 1건의 결과 이미지, 실행 정보, 입력/프롬프트 기록을
          확인합니다.
        </Text>
      </div>
      <section
        className="generationLogSummaryStrip"
        aria-label="생성 로그 요약"
      >
        <div className="generationLogChipRow">
          <StatusBadge tone={log.errorType ? "critical" : "positive"}>
            {log.errorType ?? "성공"}
          </StatusBadge>
          <StatusBadge tone="brand">{log.aiModel}</StatusBadge>
          <StatusBadge>{requestTypeLabel(log.requestType)}</StatusBadge>
          <Text
            as="span"
            textStyle="t4Regular"
            className="generationLogMutedText"
          >
            {dayjs(log.createdAt).format("YYYY-MM-DD HH:mm:ss")}
          </Text>
        </div>
        <div className="generationLogChipRow">
          <Text
            as="span"
            textStyle="t4Regular"
            className="generationLogMutedText"
          >
            토큰{" "}
            <Text as="strong" textStyle="t5Bold">
              {netTokensCharged}
            </Text>
          </Text>
          <Text
            as="span"
            textStyle="t4Regular"
            className="generationLogMutedText"
          >
            응답{" "}
            <Text as="strong" textStyle="t5Bold">
              {log.totalLatencyMs != null ? `${log.totalLatencyMs}ms` : "—"}
            </Text>
          </Text>
          <Text
            as="span"
            textStyle="t2Regular"
            className="generationLogCodeText"
          >
            work_id: {log.workId}
          </Text>
          {log.workflowId ? (
            <Text
              as="span"
              textStyle="t2Regular"
              className="generationLogCodeText"
            >
              workflow_id: {log.workflowId}
            </Text>
          ) : null}
        </div>
      </section>
    </header>
  );
}

function getPrimaryImageUrl(log: AdminGenerationLogItem): string | null {
  return log.generatedImageUrl ?? log.repeatTileUrl ?? log.accentTileUrl;
}

function getLogStatus(
  log: AdminGenerationLogItem,
): GeneratedImageItem["status"] {
  return log.errorType ? "error" : "success";
}

function getGeneratedImageItems(
  log: AdminGenerationLogItem,
  workflowLogs: AdminGenerationLogItem[],
): GeneratedImageItem[] {
  if (workflowLogs.length > 1) {
    return workflowLogs.map((workflowLog, index) => ({
      label: `결과 ${index + 1}`,
      url: getPrimaryImageUrl(workflowLog),
      workId: workflowLog.workId,
      logId: workflowLog.id,
      status: getLogStatus(workflowLog),
      totalLatencyMs: workflowLog.totalLatencyMs,
    }));
  }

  return [
    {
      label: "generated_image_url",
      url: log.generatedImageUrl,
      workId: log.workId,
      logId: log.id,
      status: getLogStatus(log),
      totalLatencyMs: log.totalLatencyMs,
    },
    {
      label: "repeat_tile_url",
      url: log.repeatTileUrl,
      workId: log.repeatTileWorkId ?? log.workId,
      logId: log.id,
      status: getLogStatus(log),
      totalLatencyMs: log.totalLatencyMs,
    },
    {
      label: "accent_tile_url",
      url: log.accentTileUrl,
      workId: log.accentTileWorkId ?? log.workId,
      logId: log.id,
      status: getLogStatus(log),
      totalLatencyMs: log.totalLatencyMs,
    },
  ]
    .filter((item): item is GeneratedImageItem & { url: string } =>
      Boolean(item.url),
    )
    .filter((item, index, allItems) => {
      const key = `${item.url}|${item.workId}`;
      return (
        allItems.findIndex(
          (candidate) => `${candidate.url}|${candidate.workId}` === key,
        ) === index
      );
    });
}

function getGenerationResultLabel(log: AdminGenerationLogItem): string {
  if (!log.generateImage) return "미요청";
  if (log.imageGenerated) return "성공";
  return "실패";
}

function GeneratedImageSection({
  log,
  workflowLogs,
  activeLogId,
  onSelectLog,
}: {
  log: AdminGenerationLogItem;
  workflowLogs: AdminGenerationLogItem[];
  activeLogId: string;
  onSelectLog: (logId: string) => void;
}) {
  const generatedImages = getGeneratedImageItems(log, workflowLogs);
  const successCount = generatedImages.filter(
    (image) => image.status === "success" && image.url,
  ).length;

  return (
    <section
      className="generationLogPanel"
      aria-labelledby="generated-images-title"
    >
      <div className="generationLogPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id="generated-images-title"
          className="generationLogSectionTitle"
        >
          생성 결과 세트
        </Text>
        {generatedImages.length > 0 ? (
          <StatusBadge
            tone={
              successCount === generatedImages.length ? "positive" : "critical"
            }
          >
            {successCount}/{generatedImages.length} 성공
          </StatusBadge>
        ) : null}
      </div>
      {generatedImages.length === 0 ? (
        <div className="generationLogPreviewPlaceholder">
          이미지 없음 ({requestTypeLabel(log.requestType)} 단계)
        </div>
      ) : (
        <div className="generationLogImageGrid">
          {generatedImages.map((item) => (
            <button
              key={`${item.logId}-${item.workId}`}
              type="button"
              className={
                item.logId === activeLogId
                  ? "generationLogImageButton generationLogImageButtonActive"
                  : "generationLogImageButton"
              }
              onClick={() => onSelectLog(item.logId)}
            >
              {item.url ? (
                <img
                  className="generationLogPreviewImage"
                  src={item.url}
                  alt={`생성 결과 ${item.label}`}
                />
              ) : (
                <div className="generationLogPreviewPlaceholder generationLogPreviewPlaceholderError">
                  이미지 없음
                </div>
              )}
              <Text
                as="h3"
                textStyle="t5Bold"
                className="generationLogSubTitle"
              >
                {item.label}
              </Text>
              <Text
                as="p"
                textStyle="t2Regular"
                className="generationLogCodeText"
              >
                {item.workId}
              </Text>
              <div className="generationLogChipRow">
                <StatusBadge tone={statusTone(item.status)}>
                  {item.status === "error" ? "실패" : "성공"}
                </StatusBadge>
                <Text
                  as="span"
                  textStyle="t2Regular"
                  className="generationLogMetaText"
                >
                  {item.totalLatencyMs != null
                    ? `${item.totalLatencyMs}ms`
                    : "-"}
                </Text>
              </div>
              {item.url ? (
                <Text
                  as="p"
                  textStyle="t2Regular"
                  className="generationLogMetaText"
                >
                  {item.url}
                </Text>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function AttachedImageSection({ log }: { log: AdminGenerationLogItem }) {
  const imageAttachments =
    log.requestAttachments?.filter(
      (attachment) => attachment.type === "image",
    ) ?? [];

  if (imageAttachments.length === 0) return null;

  return (
    <section
      className="generationLogPanel"
      aria-labelledby="attached-images-title"
    >
      <Text
        as="h2"
        textStyle="t6Bold"
        id="attached-images-title"
        className="generationLogSectionTitle"
      >
        첨부 이미지
      </Text>
      <div className="generationLogImageGrid">
        {imageAttachments.map((attachment) => {
          const isHttpsUrl = attachment.value.startsWith("https://");

          return (
            <div
              key={`${attachment.label}-${attachment.value}`}
              className="generationLogMediaItem"
            >
              {isHttpsUrl ? (
                <img
                  className="generationLogPreviewImage"
                  src={attachment.value}
                  alt={attachment.label}
                />
              ) : (
                <Callout
                  tone="warning"
                  title="첨부 이미지 URL이 저장되지 않았습니다"
                  description={attachment.value}
                />
              )}
              <Text as="strong" textStyle="t5Bold">
                {attachment.label}
              </Text>
              {attachment.fileName ? (
                <Text
                  as="span"
                  textStyle="t2Regular"
                  className="generationLogMetaText"
                >
                  {attachment.fileName}
                </Text>
              ) : null}
              {isHttpsUrl ? (
                <Text
                  as="span"
                  textStyle="t2Regular"
                  className="generationLogMetaText"
                >
                  {attachment.value}
                </Text>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
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
  const limit = 300;
  const isLong = content.length > limit;
  const displayed =
    expanded || !isLong ? content : `${content.slice(0, limit)}…`;

  return (
    <div className="generationLogExpandable">
      <Text as="strong" textStyle="t5Bold" className="generationLogFieldLabel">
        {label}
      </Text>
      <div className="generationLogExpandableBody">{displayed}</div>
      {isLong ? (
        <ActionButton
          type="button"
          variant="neutralWeak"
          aria-label={expanded ? `${label} 접기` : `${label} 더 보기`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "접기" : "더 보기"}
        </ActionButton>
      ) : null}
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (!hasJsonBlockContent(value)) return null;

  return (
    <div className="generationLogDataBlock">
      <Text as="strong" textStyle="t5Bold" className="generationLogFieldLabel">
        {label}
      </Text>
      <pre className="generationLogJsonBlock">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="generationLogDetailGrid">{children}</dl>;
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="generationLogDetailItem">
      <Text as="dt" textStyle="t4Medium" className="generationLogDetailLabel">
        {label}
      </Text>
      <Text as="dd" textStyle="t4Regular" className="generationLogDetailValue">
        {children}
      </Text>
    </div>
  );
}

function RequestOptionsSection({ log }: { log: AdminGenerationLogItem }) {
  const visibleRequestAttachments =
    log.requestAttachments?.filter(
      (attachment) => attachment.type !== "image",
    ) ?? [];
  const hasOptions =
    visibleRequestAttachments.length > 0 ||
    hasJsonBlockContent(log.designContext) ||
    hasJsonBlockContent(log.normalizedDesign) ||
    log.patternType ||
    log.fabricType ||
    log.tileRole ||
    hasJsonBlockContent(log.accentLayoutJson);

  if (!hasOptions) return null;

  return (
    <section
      className="generationLogPanel"
      aria-labelledby="request-options-title"
    >
      <Text
        as="h2"
        textStyle="t6Bold"
        id="request-options-title"
        className="generationLogSectionTitle"
      >
        사용자 선택 옵션
      </Text>
      {visibleRequestAttachments.length > 0 ? (
        <div className="generationLogChipRow">
          {visibleRequestAttachments.map((attachment, index) => (
            <StatusBadge
              key={`${attachment.type}-${attachment.value}-${index}`}
            >
              {attachment.label}: {attachment.value}
              {attachment.fileName ? ` (${attachment.fileName})` : ""}
            </StatusBadge>
          ))}
        </div>
      ) : null}
      <DetailGrid>
        <DetailItem label="pattern_type">{log.patternType ?? "-"}</DetailItem>
        <DetailItem label="fabric_type">{log.fabricType ?? "-"}</DetailItem>
        <DetailItem label="tile_role">{log.tileRole ?? "-"}</DetailItem>
      </DetailGrid>
      <JsonBlock label="design_context" value={log.designContext} />
      <JsonBlock label="normalized_design" value={log.normalizedDesign} />
      <JsonBlock label="accent_layout_json" value={log.accentLayoutJson} />
    </section>
  );
}

function ExecutionLogSection({ log }: { log: AdminGenerationLogItem }) {
  return (
    <section
      className="generationLogPanel"
      aria-labelledby="execution-log-title"
    >
      <Text
        as="h2"
        textStyle="t6Bold"
        id="execution-log-title"
        className="generationLogSectionTitle"
      >
        선택 결과 실행 정보
      </Text>
      <DetailGrid>
        <DetailItem label="created_at">
          {formatDateTimeSeconds(log.createdAt)}
        </DetailItem>
        <DetailItem label="conversation_turn">
          {log.conversationTurn}
        </DetailItem>
        <DetailItem label="prompt_length">{log.promptLength}자</DetailItem>
        <DetailItem label="result">{getGenerationResultLabel(log)}</DetailItem>
        <DetailItem label="workflow_id">{log.workflowId ?? "-"}</DetailItem>
        <DetailItem label="work_id">{log.workId}</DetailItem>
        <DetailItem label="parent_work_id">
          {log.parentWorkId ?? "-"}
        </DetailItem>
        <DetailItem label="route">{log.route ?? "-"}</DetailItem>
        <DetailItem label="request_type">{log.requestType ?? "-"}</DetailItem>
        <DetailItem label="quality">{log.quality ?? "-"}</DetailItem>
        <DetailItem label="latency">
          total {log.totalLatencyMs ?? "-"}ms / text {log.textLatencyMs ?? "-"}
          ms / image {log.imageLatencyMs ?? "-"}ms
        </DetailItem>
        <DetailItem label="tokens">
          charged {log.tokensCharged} / refunded {log.tokensRefunded}
        </DetailItem>
        <DetailItem label="error">{log.errorType ?? "없음"}</DetailItem>
      </DetailGrid>
      {log.errorMessage ? (
        <Callout tone="critical" description={log.errorMessage} role="alert" />
      ) : null}
    </section>
  );
}

function PromptSection({ log }: { log: AdminGenerationLogItem }) {
  const shouldHaveImagePrompt = log.generateImage === true;

  return (
    <section className="generationLogPanel" aria-labelledby="prompt-title">
      <Text
        as="h2"
        textStyle="t6Bold"
        id="prompt-title"
        className="generationLogSectionTitle"
      >
        프롬프트 & AI 응답
      </Text>
      <div className="generationLogPromptGrid">
        <div className="generationLogTextColumn">
          <ExpandableText label="사용자 프롬프트" content={log.userMessage} />
          {log.imagePrompt ? (
            <ExpandableText
              label="이미지 생성 프롬프트"
              content={log.imagePrompt}
            />
          ) : shouldHaveImagePrompt ? (
            <Callout
              tone="warning"
              title="이미지 생성 프롬프트가 저장되지 않았습니다"
              description="이 로그는 image_prompt 저장 이전에 생성되었거나, 생성 함수가 최종 이미지 프롬프트를 저장하지 못한 기록입니다."
            />
          ) : (
            <Callout
              title="이미지 생성 프롬프트가 없습니다"
              description="이미지 생성을 요청하지 않은 로그입니다."
            />
          )}
        </div>
        <div className="generationLogTextColumn">
          {log.aiMessage ? (
            <ExpandableText label="AI 응답" content={log.aiMessage} />
          ) : (
            <Text
              as="p"
              textStyle="t4Regular"
              className="generationLogMutedText"
            >
              AI 응답이 없습니다.
            </Text>
          )}
        </div>
      </div>
    </section>
  );
}

function getGenerationResultRank(log: AdminGenerationLogItem): number {
  if (log.phase === "render") return 0;
  return 1;
}

export function GenerationLogDetailPage({ id }: { id: string }) {
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
          getGenerationResultRank(left) - getGenerationResultRank(right);
        if (rankDiff !== 0) return rankDiff;
        return (
          dayjs(right.createdAt).valueOf() - dayjs(left.createdAt).valueOf()
        );
      }),
    [workflowLogs],
  );
  const activeLog = useMemo(() => {
    if (orderedWorkflowLogs.length === 0) return requestedLog;
    return (
      orderedWorkflowLogs.find((log) => log.id === activeLogId) ??
      orderedWorkflowLogs.find((log) => log.id === id) ??
      orderedWorkflowLogs[0] ??
      requestedLog
    );
  }, [activeLogId, id, orderedWorkflowLogs, requestedLog]);

  if (isDetailLoading || (requestedLog?.workflowId && isWorkflowLoading)) {
    return (
      <main className="generationLogPage">
        <AdminPanelSkeleton lines={6} />
      </main>
    );
  }

  if (detailErrorMessage || !activeLog) {
    return (
      <main className="generationLogPage">
        <Callout
          tone="critical"
          title="로그를 불러올 수 없습니다"
          description={
            detailErrorMessage ?? "해당 ID의 로그가 존재하지 않습니다."
          }
          role="alert"
        />
      </main>
    );
  }

  return (
    <main className="generationLogPage">
      <DetailHeader log={activeLog} />
      <GeneratedImageSection
        log={activeLog}
        workflowLogs={orderedWorkflowLogs}
        activeLogId={activeLog.id}
        onSelectLog={selectLog}
      />
      <ExecutionLogSection log={activeLog} />
      <AttachedImageSection log={activeLog} />
      <RequestOptionsSection log={activeLog} />
      <PromptSection log={activeLog} />
    </main>
  );
}
