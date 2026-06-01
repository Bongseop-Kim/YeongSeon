import { Text } from "seed-design/ui/text";
import { useState } from "react";
import dayjs from "dayjs";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  DesignContextStats,
  GenerationLogStats,
  GenerationLogTable,
  type GenerationRequestTypeFilter,
  type GenerationStatusFilter,
  useGenerationLogsQuery,
  useGenerationStatsQuery,
} from "@/features/generation-logs";
import "@/features/generation-logs/components/generation-logs.css";

const EMPTY_SUMMARY = {
  totalRequests: 0,
  imageSuccessRate: 0,
  totalTokensConsumed: 0,
  avgTotalLatencyMs: 0,
};

export default function GenerationLogList() {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(6, "day").format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD"),
  ]);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [requestType, setRequestType] =
    useState<GenerationRequestTypeFilter | null>(null);
  const [status, setStatus] = useState<GenerationStatusFilter | null>(null);
  const [idSearchInput, setIdSearchInput] = useState("");
  const [idSearch, setIdSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statsOpen, setStatsOpen] = useState(false);
  const { data: statsData, isLoading: statsLoading } =
    useGenerationStatsQuery(dateRange);
  const {
    data: logsData,
    hasMore: logsHasMore,
    isLoading: logsLoading,
  } = useGenerationLogsQuery({
    dateRange,
    aiModel,
    page,
    requestType,
    status,
    idSearch: idSearch.trim() || null,
  });

  const resetPage = () => setPage(1);

  const updateDateRange = (index: 0 | 1, value: string): void => {
    setDateRange((prev) => {
      const next: [string, string] = [...prev];
      next[index] = value;
      return next;
    });
    resetPage();
  };

  const handleIdSearchSubmit = (): void => {
    setIdSearch(idSearchInput);
    resetPage();
  };

  return (
    <main className="generationLogPage">
      <header className="generationLogHeader">
        <div className="generationLogTitleGroup">
          <Text as="h1" textStyle="screenTitle" className="generationLogTitle">
            AI 생성 로그
          </Text>
          <Text
            as="p"
            textStyle="t4Regular"
            className="generationLogDescription"
          >
            생성 요청, 결과 이미지, 토큰 사용량과 오류 분포를 확인합니다.
          </Text>
        </div>
      </header>

      <section
        className="generationLogPanel"
        aria-labelledby="generation-filter-title"
      >
        <div className="generationLogPanelHeader">
          <Text
            as="h2"
            textStyle="t6Bold"
            id="generation-filter-title"
            className="generationLogPanelTitle"
          >
            조회 조건
          </Text>
        </div>
        <form
          className="generationLogToolbar"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="generationLogField">
            <Text
              as="span"
              textStyle="t3Bold"
              className="generationLogFieldLabel"
            >
              시작일
            </Text>
            <input
              className="generationLogInput"
              type="date"
              value={dateRange[0]}
              onChange={(event) => updateDateRange(0, event.target.value)}
            />
          </label>
          <label className="generationLogField">
            <Text
              as="span"
              textStyle="t3Bold"
              className="generationLogFieldLabel"
            >
              종료일
            </Text>
            <input
              className="generationLogInput"
              type="date"
              value={dateRange[1]}
              onChange={(event) => updateDateRange(1, event.target.value)}
            />
          </label>
          <label className="generationLogField">
            <Text
              as="span"
              textStyle="t3Bold"
              className="generationLogFieldLabel"
            >
              요청 유형
            </Text>
            <select
              className="generationLogSelect"
              value={requestType ?? ""}
              onChange={(event) => {
                setRequestType(
                  (event.target.value ||
                    null) as GenerationRequestTypeFilter | null,
                );
                resetPage();
              }}
            >
              <option value="">모든 요청 유형</option>
              <option value="render_standard">렌더(표준)</option>
            </select>
          </label>
          <label className="generationLogField">
            <Text
              as="span"
              textStyle="t3Bold"
              className="generationLogFieldLabel"
            >
              상태
            </Text>
            <select
              className="generationLogSelect"
              value={status ?? ""}
              onChange={(event) => {
                setStatus(
                  (event.target.value || null) as GenerationStatusFilter | null,
                );
                resetPage();
              }}
            >
              <option value="">모든 상태</option>
              <option value="success">성공</option>
              <option value="error">에러</option>
            </select>
          </label>
          <label className="generationLogField generationLogSearchField">
            <Text
              as="span"
              textStyle="t3Bold"
              className="generationLogFieldLabel"
            >
              workflow_id / work_id
            </Text>
            <input
              className="generationLogInput"
              value={idSearchInput}
              placeholder="workflow_id / work_id"
              onChange={(event) => {
                const nextValue = event.target.value;
                setIdSearchInput(nextValue);
                if (nextValue === "") {
                  setIdSearch("");
                  resetPage();
                }
              }}
            />
          </label>
          <ActionButton type="button" onClick={handleIdSearchSubmit}>
            검색
          </ActionButton>
        </form>
      </section>

      {statsLoading ? (
        <Text
          as="p"
          textStyle="t4Regular"
          className="generationLogMutedText"
          aria-live="polite"
        >
          통계 불러오는 중…
        </Text>
      ) : (
        <GenerationLogStats stats={statsData?.summary ?? EMPTY_SUMMARY} />
      )}

      <section
        className="generationLogPanel"
        aria-labelledby="generation-stats-title"
      >
        <div className="generationLogPanelHeader">
          <div className="generationLogPanelTitleGroup">
            <Text
              as="h2"
              textStyle="t6Bold"
              id="generation-stats-title"
              className="generationLogPanelTitle"
            >
              모델·패턴·에러 통계
            </Text>
          </div>
          <ActionButton
            type="button"
            variant="neutralWeak"
            onClick={() => setStatsOpen((value) => !value)}
          >
            {statsOpen ? "통계 접기" : "통계 펼치기"}
          </ActionButton>
        </div>
        {statsOpen ? (
          <DesignContextStats
            byModel={statsData?.byModel ?? []}
            byInputType={statsData?.byInputType ?? []}
            byPattern={statsData?.byPattern ?? []}
            byError={statsData?.byError ?? []}
            loading={statsLoading}
          />
        ) : null}
      </section>

      <section
        className="generationLogPanel"
        aria-labelledby="generation-log-list-title"
      >
        <div className="generationLogPanelHeader">
          <Text
            as="h2"
            textStyle="t6Bold"
            id="generation-log-list-title"
            className="generationLogPanelTitle"
          >
            로그 목록
          </Text>
        </div>
        {dateRange[0] > dateRange[1] ? (
          <Callout
            tone="critical"
            description="시작일은 종료일보다 늦을 수 없습니다."
            role="alert"
          />
        ) : null}
        <GenerationLogTable
          data={logsData ?? []}
          loading={logsLoading}
          page={page}
          hasMore={logsHasMore}
          onPageChange={setPage}
          aiModel={aiModel}
          onAiModelChange={(model) => {
            setAiModel(model);
            resetPage();
          }}
        />
      </section>
    </main>
  );
}
