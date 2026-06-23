import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { Callout } from "seed-design/ui/callout";
import {
  AdminFilterField,
  AdminFilterSelect,
  AdminFilterTextField,
} from "@/components/AdminFilterControls";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import { AdminPanelHeader } from "@/components/AdminPanelHeader";
import {
  SeamlessLogStats,
  SeamlessLogTable,
  SEAMLESS_LOG_PAGE_SIZE,
  type SeamlessInputTypeFilter,
  type SeamlessStatusFilter,
  useSeamlessLogsQuery,
  useSeamlessStatsQuery,
} from "@/features/seamless-logs";

const EMPTY_SUMMARY = {
  total: 0,
  successCount: 0,
  partialCount: 0,
  errorCount: 0,
  avgGenerateMs: 0,
  avgRenderMs: 0,
};
const SEAMLESS_LOG_SEARCH_DEBOUNCE_MS = 300;
const VALID_STATUSES: SeamlessStatusFilter[] = ["success", "partial", "error"];
const VALID_INPUT_TYPES: SeamlessInputTypeFilter[] = [
  "intent",
  "prompt",
  "reference_image",
];

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

function normalizeStatusParam(
  value: string | null,
): SeamlessStatusFilter | null {
  if (!value) return null;
  return VALID_STATUSES.some((status) => status === value)
    ? (value as SeamlessStatusFilter)
    : null;
}

function normalizeInputTypeParam(
  value: string | null,
): SeamlessInputTypeFilter | null {
  if (!value) return null;
  return VALID_INPUT_TYPES.some((inputType) => inputType === value)
    ? (value as SeamlessInputTypeFilter)
    : null;
}

export default function SeamlessLogList() {
  const [defaultDateFrom, defaultDateTo] = getDefaultDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateRange: [string, string] = [
    searchParams.get("dateFrom") ?? defaultDateFrom,
    searchParams.get("dateTo") ?? defaultDateTo,
  ];
  const status = normalizeStatusParam(searchParams.get("status"));
  const inputType = normalizeInputTypeParam(searchParams.get("inputType"));
  const idSearch = searchParams.get("idSearch") ?? "";
  const page = parsePageParam(searchParams.get("page"));
  const isDateRangeValid = dateRange[0] <= dateRange[1];
  const [idSearchInputState, setIdSearchInputState] = useState({
    source: idSearch,
    value: idSearch,
  });
  const { data: statsData, isLoading: statsLoading } = useSeamlessStatsQuery(
    dateRange,
    isDateRangeValid,
  );

  useEffect(() => {
    if (idSearchInputState.source === idSearch) return;
    setIdSearchInputState({ source: idSearch, value: idSearch });
  }, [idSearch, idSearchInputState.source]);

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
    }, SEAMLESS_LOG_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [idSearchInput, idSearch, setSearchParams]);

  const {
    data: logsData,
    hasMore: logsHasMore,
    isLoading: logsLoading,
  } = useSeamlessLogsQuery({
    dateRange,
    page,
    inputType,
    status,
    idSearch: idSearch || null,
    enabled: isDateRangeValid,
  });

  const logs = isDateRangeValid ? (logsData ?? []) : [];
  const hasMoreLogs = isDateRangeValid && logsHasMore;
  const logCountText = isDateRangeValid
    ? hasMoreLogs
      ? `${page * SEAMLESS_LOG_PAGE_SIZE}+`
      : String((page - 1) * SEAMLESS_LOG_PAGE_SIZE + logs.length)
    : "0";

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
      <div className="generationLogHeader">
        <AdminPageHeader
          title="Seamless 생성 로그"
          description="seamless SVG 생성 요청, 후보 미리보기, 실행 시간과 상태 분포를 확인합니다."
        />
      </div>

      <section
        className="generationLogPanel"
        aria-labelledby="seamless-filter-title"
      >
        <div className="generationLogPanelHeader">
          <AdminPanelHeader title="조회 조건" id="seamless-filter-title" />
        </div>
        <form
          className="generationLogToolbar"
          onSubmit={(event) => event.preventDefault()}
        >
          <AdminFilterField>
            <AdminFilterTextField
              label="시작일"
              value={dateRange[0]}
              onValueChange={({ value }) => updateParams({ dateFrom: value })}
              inputProps={{ name: "seamless-date-from", type: "date" }}
            />
          </AdminFilterField>
          <AdminFilterField>
            <AdminFilterTextField
              label="종료일"
              value={dateRange[1]}
              onValueChange={({ value }) => updateParams({ dateTo: value })}
              inputProps={{ name: "seamless-date-to", type: "date" }}
            />
          </AdminFilterField>
          <AdminFilterField>
            <AdminFilterSelect
              label="입력 타입"
              name="seamless-input-type"
              value={inputType ?? ""}
              onChange={(event) =>
                updateParams({ inputType: event.target.value || null })
              }
            >
              <option value="">모든 입력</option>
              <option value="intent">intent</option>
              <option value="prompt">prompt</option>
              <option value="reference_image">reference image</option>
            </AdminFilterSelect>
          </AdminFilterField>
          <AdminFilterField>
            <AdminFilterSelect
              label="상태"
              name="seamless-status"
              value={status ?? ""}
              onChange={(event) =>
                updateParams({ status: event.target.value || null })
              }
            >
              <option value="">모든 상태</option>
              <option value="success">성공</option>
              <option value="partial">부분 성공</option>
              <option value="error">에러</option>
            </AdminFilterSelect>
          </AdminFilterField>
          <AdminFilterField className="adminFilterFieldWide">
            <AdminFilterTextField
              label="요청 ID"
              prefixIcon={<IconMagnifyingglassLine />}
              value={idSearchInput}
              onValueChange={({ value }) => setIdSearchInput(value)}
              inputProps={{
                name: "seamless-id-search",
                autoComplete: "off",
                placeholder: "request_id 또는 로그 id",
              }}
            />
          </AdminFilterField>
        </form>
      </section>

      {isDateRangeValid && statsLoading ? (
        <AdminPanelSkeleton lines={3} />
      ) : (
        <SeamlessLogStats
          stats={
            isDateRangeValid
              ? (statsData?.summary ?? EMPTY_SUMMARY)
              : EMPTY_SUMMARY
          }
        />
      )}

      <section
        className="generationLogPanel"
        aria-labelledby="seamless-log-list-title"
      >
        <div className="generationLogPanelHeader">
          <AdminPanelHeader
            title="로그 목록"
            id="seamless-log-list-title"
            count={`${logCountText}건`}
          />
        </div>
        {dateRange[0] > dateRange[1] ? (
          <Callout
            tone="critical"
            description="시작일은 종료일보다 늦을 수 없습니다."
            role="alert"
          />
        ) : null}
        <SeamlessLogTable
          data={logs}
          loading={isDateRangeValid && logsLoading}
          page={page}
          hasMore={hasMoreLogs}
          onPageChange={(nextPage) =>
            updateParams({ page: String(nextPage) }, { resetPage: false })
          }
        />
      </section>
    </main>
  );
}
