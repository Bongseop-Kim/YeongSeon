import { Text } from "seed-design/ui/text";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  AdminFilterField,
  AdminFilterSelect,
  AdminFilterTextField,
} from "@/components/AdminFilterControls";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import {
  DesignContextStats,
  GenerationLogStats,
  GenerationLogTable,
  type GenerationStatusFilter,
  useGenerationLogsQuery,
  useGenerationStatsQuery,
} from "@/features/generation-logs";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/constants";
import "@/features/generation-logs/components/generation-logs.css";

const EMPTY_SUMMARY = {
  totalRequests: 0,
  imageSuccessRate: 0,
  totalTokensConsumed: 0,
  avgTotalLatencyMs: 0,
};
const GENERATION_LOG_SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_AI_MODEL = "openai";
const VALID_STATUSES: GenerationStatusFilter[] = ["success", "error"];

function getDefaultDateRange(): [string, string] {
  return [
    dayjs().subtract(6, "day").format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD"),
  ];
}

function parsePageParam(value: string | null): number {
  const page = Number(value ?? "1");
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function normalizeAiModelParam(value: string | null): string | null {
  if (!value) return null;
  return value === DEFAULT_AI_MODEL ? value : null;
}

function isGenerationStatusFilter(
  value: string,
): value is GenerationStatusFilter {
  return VALID_STATUSES.some((status) => status === value);
}

function normalizeStatusParam(
  value: string | null,
): GenerationStatusFilter | null {
  if (!value) return null;
  return isGenerationStatusFilter(value) ? value : null;
}

export default function GenerationLogList() {
  const [defaultDateFrom, defaultDateTo] = getDefaultDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateRange: [string, string] = [
    searchParams.get("dateFrom") ?? defaultDateFrom,
    searchParams.get("dateTo") ?? defaultDateTo,
  ];
  const aiModel = normalizeAiModelParam(searchParams.get("aiModel"));
  const status = normalizeStatusParam(searchParams.get("status"));
  const idSearch = searchParams.get("idSearch") ?? "";
  const page = parsePageParam(searchParams.get("page"));
  const [idSearchInputState, setIdSearchInputState] = useState({
    source: idSearch,
    value: idSearch,
  });
  const [statsOpen, setStatsOpen] = useState(false);
  const { data: statsData, isLoading: statsLoading } =
    useGenerationStatsQuery(dateRange);

  if (idSearchInputState.source !== idSearch) {
    setIdSearchInputState({ source: idSearch, value: idSearch });
  }

  const idSearchInput =
    idSearchInputState.source === idSearch
      ? idSearchInputState.value
      : idSearch;

  const setIdSearchInput = (value: string): void => {
    setIdSearchInputState({ source: idSearch, value });
  };

  useEffect(() => {
    const nextIdSearch = idSearchInput.trim();
    if (nextIdSearch === idSearch) return;

    const timeoutId = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("page", "1");
          if (nextIdSearch) next.set("idSearch", nextIdSearch);
          else next.delete("idSearch");
          return next;
        },
        { replace: true },
      );
    }, GENERATION_LOG_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [idSearchInput, idSearch, setSearchParams]);

  const {
    data: logsData,
    hasMore: logsHasMore,
    isLoading: logsLoading,
  } = useGenerationLogsQuery({
    dateRange,
    aiModel,
    page,
    requestType: null,
    status,
    idSearch: idSearch || null,
  });

  const logCountText = logsHasMore
    ? `${page * GENERATION_LOG_PAGE_SIZE}+`
    : String((page - 1) * GENERATION_LOG_PAGE_SIZE + (logsData?.length ?? 0));

  const updateParams = (
    patch: Record<string, string | null>,
    options: { resetPage?: boolean } = { resetPage: true },
  ): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      if (options.resetPage) next.set("page", "1");
      return next;
    });
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
          <AdminFilterField label="시작일">
            <AdminFilterTextField
              value={dateRange[0]}
              onValueChange={({ value }) => updateParams({ dateFrom: value })}
              inputProps={{ name: "generation-date-from", type: "date" }}
            />
          </AdminFilterField>
          <AdminFilterField label="종료일">
            <AdminFilterTextField
              value={dateRange[1]}
              onValueChange={({ value }) => updateParams({ dateTo: value })}
              inputProps={{ name: "generation-date-to", type: "date" }}
            />
          </AdminFilterField>
          <AdminFilterField label="상태">
            <AdminFilterSelect
              name="generation-status"
              value={status ?? ""}
              onChange={(event) =>
                updateParams({ status: event.target.value || null })
              }
            >
              <option value="">모든 상태</option>
              <option value="success">성공</option>
              <option value="error">에러</option>
            </AdminFilterSelect>
          </AdminFilterField>
          <AdminFilterField
            label="워크플로우/작업 ID"
            className="adminFilterFieldWide"
          >
            <AdminFilterTextField
              prefixIcon={<IconMagnifyingglassLine />}
              value={idSearchInput}
              onValueChange={({ value }) => setIdSearchInput(value)}
              inputProps={{
                name: "generation-id-search",
                autoComplete: "off",
                placeholder: "워크플로우 ID 또는 작업 ID",
              }}
            />
          </AdminFilterField>
        </form>
      </section>

      {statsLoading ? (
        <AdminPanelSkeleton lines={3} />
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
            <Text as="span" textStyle="t2Bold" className="adminPanelCountBadge">
              {logCountText}건
            </Text>
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
          logCountText={logCountText}
          onPageChange={(nextPage) =>
            updateParams({ page: String(nextPage) }, { resetPage: false })
          }
          aiModel={aiModel}
          onAiModelChange={(model) => updateParams({ aiModel: model })}
        />
      </section>
    </main>
  );
}
