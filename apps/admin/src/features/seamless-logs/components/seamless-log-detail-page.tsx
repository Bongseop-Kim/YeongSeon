import { Text } from "seed-design/ui/text";
import dayjs from "dayjs";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import { AdminDetailItem, AdminDetailList } from "@/components/AdminDetailList";
import { StatusBadge } from "@/components/StatusBadge";
import { useSeamlessLogDetailQuery } from "@/features/seamless-logs/api/seamless-logs-query";
import {
  inputTypeLabel,
  statusLabel,
  statusTone,
} from "@/features/seamless-logs/utils";
import { hasJsonBlockContent } from "@/features/seamless-logs/utils/json-block";
import { formatDateTimeSeconds } from "@/utils/format-date-time";
import type {
  AdminSeamlessLogCandidate,
  AdminSeamlessLogItem,
} from "@/features/seamless-logs/types/admin-seamless-log";
import "./seamless-logs.css";

function DetailHeader({ log }: { log: AdminSeamlessLogItem }) {
  return (
    <header className="generationLogHeader">
      <div className="generationLogTitleGroup">
        <Text as="p" textStyle="t2Regular" className="generationLogBreadcrumb">
          Seamless 생성 로그 / 상세
        </Text>
        <Text as="h1" textStyle="t8Bold" className="generationLogTitle">
          Seamless 생성 로그 상세
        </Text>
        <Text as="p" textStyle="t4Regular" className="generationLogDescription">
          생성 요청 1건의 intent, 후보 미리보기, 실행 정보를 확인합니다.
        </Text>
      </div>
      <section
        className="generationLogSummaryStrip"
        aria-label="생성 로그 요약"
      >
        <div className="generationLogChipRow">
          <StatusBadge tone={statusTone(log.status)}>
            {statusLabel(log.status)}
          </StatusBadge>
          <StatusBadge tone="brand">
            {inputTypeLabel(log.inputType)}
          </StatusBadge>
          {log.colorway ? <StatusBadge>{log.colorway}</StatusBadge> : null}
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
            생성{" "}
            <Text as="strong" textStyle="t5Bold">
              {log.generateMs != null ? `${Math.round(log.generateMs)}ms` : "—"}
            </Text>
          </Text>
          <Text
            as="span"
            textStyle="t4Regular"
            className="generationLogMutedText"
          >
            렌더{" "}
            <Text as="strong" textStyle="t5Bold">
              {log.renderMs != null ? `${Math.round(log.renderMs)}ms` : "—"}
            </Text>
          </Text>
          {log.requestId ? (
            <Text
              as="span"
              textStyle="t2Regular"
              className="generationLogCodeText"
            >
              request_id: {log.requestId}
            </Text>
          ) : null}
          <Text
            as="span"
            textStyle="t2Regular"
            className="generationLogCodeText"
          >
            id: {log.id}
          </Text>
        </div>
      </section>
    </header>
  );
}

function downloadSvg(candidate: AdminSeamlessLogCandidate): void {
  if (!candidate.svg) return;
  const blob = new Blob([candidate.svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${candidate.id ?? "candidate"}.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function CandidateSection({ log }: { log: AdminSeamlessLogItem }) {
  return (
    <section
      className="generationLogPanel"
      aria-labelledby="seamless-candidates-title"
    >
      <div className="generationLogPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id="seamless-candidates-title"
          className="generationLogSectionTitle"
        >
          후보 세트
        </Text>
        <StatusBadge>{log.candidates.length}개</StatusBadge>
      </div>
      {log.candidates.length === 0 ? (
        <div className="generationLogPreviewPlaceholder">후보가 없습니다.</div>
      ) : (
        <div className="generationLogImageGrid">
          {log.candidates.map((candidate, index) => (
            <div
              key={candidate.id ?? `candidate-${index}`}
              className="generationLogMediaItem"
            >
              {candidate.pngUrl ? (
                <img
                  className="generationLogPreviewImage"
                  src={candidate.pngUrl}
                  alt={`candidate ${index + 1}`}
                />
              ) : (
                <div className="generationLogPreviewPlaceholder generationLogPreviewPlaceholderError">
                  미리보기 없음
                </div>
              )}
              <Text
                as="h3"
                textStyle="t5Bold"
                className="generationLogSubTitle"
              >
                {candidate.id ?? `후보 ${index + 1}`}
              </Text>
              <div className="generationLogChipRow">
                {candidate.layoutId ? (
                  <StatusBadge>{candidate.layoutId}</StatusBadge>
                ) : null}
                {candidate.sourceFidelity ? (
                  <StatusBadge>{candidate.sourceFidelity}</StatusBadge>
                ) : null}
                {candidate.colorwayId ? (
                  <StatusBadge>{candidate.colorwayId}</StatusBadge>
                ) : null}
              </div>
              {candidate.seed != null ? (
                <Text
                  as="span"
                  textStyle="t2Regular"
                  className="generationLogMetaText"
                >
                  seed: {candidate.seed}
                </Text>
              ) : null}
              {candidate.svg ? (
                <ActionButton
                  type="button"
                  variant="neutralWeak"
                  onClick={() => downloadSvg(candidate)}
                >
                  SVG 다운로드
                </ActionButton>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExecutionLogSection({ log }: { log: AdminSeamlessLogItem }) {
  return (
    <section
      className="generationLogPanel"
      aria-labelledby="seamless-execution-title"
    >
      <Text
        as="h2"
        textStyle="t6Bold"
        id="seamless-execution-title"
        className="generationLogSectionTitle"
      >
        실행 정보
      </Text>
      <AdminDetailList columns={3}>
        <AdminDetailItem label="created_at">
          {formatDateTimeSeconds(log.createdAt)}
        </AdminDetailItem>
        <AdminDetailItem label="input_type">
          {log.inputType ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="status">{log.status ?? "-"}</AdminDetailItem>
        <AdminDetailItem label="colorway">
          {log.colorway ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="seed">{log.seed ?? "-"}</AdminDetailItem>
        <AdminDetailItem label="has_reference_image">
          {log.hasReferenceImage ? "예" : "아니오"}
        </AdminDetailItem>
        <AdminDetailItem label="reference_image_bytes">
          {log.referenceImageBytes ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="candidates">
          {log.candidateCountReturned ?? "-"} /{" "}
          {log.candidateCountRequested ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="distinct_layouts">
          {log.distinctLayouts ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="available_strategies">
          {log.availableStrategies ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="timings">
          generate {log.generateMs != null ? Math.round(log.generateMs) : "-"}ms
          / render {log.renderMs != null ? Math.round(log.renderMs) : "-"}ms
        </AdminDetailItem>
        <AdminDetailItem label="engine / registry">
          {log.engineVersion ?? "-"} / {log.registryVersion ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="error">
          {log.errorType ?? "없음"}
        </AdminDetailItem>
      </AdminDetailList>
      {log.errorMessage ? (
        <Callout tone="critical" description={log.errorMessage} role="alert" />
      ) : null}
      {log.warnings.length > 0 ? (
        <Callout
          tone="warning"
          title="경고"
          description={log.warnings.join("\n")}
        />
      ) : null}
    </section>
  );
}

function IntentSection({ log }: { log: AdminSeamlessLogItem }) {
  return (
    <section
      className="generationLogPanel"
      aria-labelledby="seamless-intent-title"
    >
      <Text
        as="h2"
        textStyle="t6Bold"
        id="seamless-intent-title"
        className="generationLogSectionTitle"
      >
        intent
      </Text>
      {log.prompt ? (
        <div className="generationLogDataBlock">
          <Text
            as="strong"
            textStyle="t5Bold"
            className="generationLogFieldLabel"
          >
            prompt
          </Text>
          <pre className="generationLogJsonBlock">{log.prompt}</pre>
        </div>
      ) : null}
      {hasJsonBlockContent(log.intent) ? (
        <div className="generationLogDataBlock">
          <Text
            as="strong"
            textStyle="t5Bold"
            className="generationLogFieldLabel"
          >
            intent JSON
          </Text>
          <pre className="generationLogJsonBlock">
            {JSON.stringify(log.intent, null, 2)}
          </pre>
        </div>
      ) : (
        <Text as="p" textStyle="t4Regular" className="generationLogMutedText">
          intent 기록이 없습니다.
        </Text>
      )}
    </section>
  );
}

export function SeamlessLogDetailPage({ id }: { id: string }) {
  const { data: log, isLoading, errorMessage } = useSeamlessLogDetailQuery(id);

  if (isLoading) {
    return (
      <main className="generationLogPage">
        <AdminPanelSkeleton lines={6} />
      </main>
    );
  }

  if (errorMessage || !log) {
    return (
      <main className="generationLogPage">
        <Callout
          tone="critical"
          title="로그를 불러올 수 없습니다"
          description={errorMessage ?? "해당 ID의 로그가 존재하지 않습니다."}
          role="alert"
        />
      </main>
    );
  }

  return (
    <main className="generationLogPage">
      <DetailHeader log={log} />
      <CandidateSection log={log} />
      <ExecutionLogSection log={log} />
      <IntentSection log={log} />
    </main>
  );
}
