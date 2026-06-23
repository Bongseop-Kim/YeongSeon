import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { Callout } from "seed-design/ui/callout";
import {
  AdminFilterField,
  AdminFilterSelect,
  AdminFilterTextField,
} from "@/components/AdminFilterControls";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminPanelHeader } from "@/components/AdminPanelHeader";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import {
  MotifGrid,
  type MotifSourceFilter,
  type MotifStatusFilter,
  useAdminMotifsQuery,
} from "@/features/motifs";

const MOTIF_SEARCH_DEBOUNCE_MS = 300;
const VALID_STATUSES: MotifStatusFilter[] = ["auto", "curated"];
const VALID_SOURCES: MotifSourceFilter[] = ["llm", "recraft", "builtin"];

function parsePageParam(value: string | null): number {
  const page = Number(value ?? "1");
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function normalizeStatusParam(value: string | null): MotifStatusFilter | null {
  if (!value) return null;
  return VALID_STATUSES.some((status) => status === value)
    ? (value as MotifStatusFilter)
    : null;
}

function normalizeSourceParam(value: string | null): MotifSourceFilter | null {
  if (!value) return null;
  return VALID_SOURCES.some((source) => source === value)
    ? (value as MotifSourceFilter)
    : null;
}

export default function MotifList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = normalizeStatusParam(searchParams.get("status"));
  const source = normalizeSourceParam(searchParams.get("source"));
  const idSearch = searchParams.get("idSearch") ?? "";
  const page = parsePageParam(searchParams.get("page"));
  const [idSearchInputState, setIdSearchInputState] = useState({
    source: idSearch,
    value: idSearch,
  });

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
    }, MOTIF_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [idSearchInput, idSearch, setSearchParams]);

  const { data, hasMore, isLoading, errorMessage } = useAdminMotifsQuery({
    page,
    status,
    source,
    idSearch: idSearch || null,
  });

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
    <main className="motifPage">
      <AdminPageHeader
        title="Motif SVG"
        description="seamless-tile motif registry의 SVG primitive를 확인합니다."
      />

      <section
        className="motifFilterPanel"
        aria-labelledby="motif-filter-title"
      >
        <AdminPanelHeader title="조회 조건" id="motif-filter-title" />
        <form
          className="motifFilterBar"
          onSubmit={(event) => event.preventDefault()}
        >
          <AdminFilterField>
            <AdminFilterSelect
              label="상태"
              name="motif-status"
              value={status ?? ""}
              onChange={(event) =>
                updateParams({ status: event.target.value || null })
              }
            >
              <option value="">모든 상태</option>
              <option value="auto">auto</option>
              <option value="curated">curated</option>
            </AdminFilterSelect>
          </AdminFilterField>
          <AdminFilterField>
            <AdminFilterSelect
              label="소스"
              name="motif-source"
              value={source ?? ""}
              onChange={(event) =>
                updateParams({ source: event.target.value || null })
              }
            >
              <option value="">모든 소스</option>
              <option value="recraft">recraft</option>
              <option value="llm">llm</option>
              <option value="builtin">builtin</option>
            </AdminFilterSelect>
          </AdminFilterField>
          <AdminFilterField className="adminFilterFieldWide">
            <AdminFilterTextField
              label="motif id"
              prefixIcon={<IconMagnifyingglassLine />}
              value={idSearchInput}
              onValueChange={({ value }) => setIdSearchInput(value)}
              inputProps={{
                name: "motif-id-search",
                autoComplete: "off",
                placeholder: "motif id",
              }}
            />
          </AdminFilterField>
        </form>
      </section>

      <section className="motifListPanel" aria-labelledby="motif-list-title">
        <AdminPanelHeader title="Motif 목록" id="motif-list-title" />
        {errorMessage ? (
          <Callout tone="critical" description={errorMessage} role="alert" />
        ) : null}
        {isLoading ? (
          <AdminPanelSkeleton lines={6} />
        ) : (
          <MotifGrid
            data={data ?? []}
            page={page}
            hasMore={hasMore}
            onPageChange={(nextPage) =>
              updateParams({ page: String(nextPage) }, { resetPage: false })
            }
          />
        )}
      </section>
    </main>
  );
}
