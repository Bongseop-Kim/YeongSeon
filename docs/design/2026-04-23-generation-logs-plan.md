# Generation Logs UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생성 로그 리스트에 필터 강화·통계 접기 적용, 상세 라우트(`/generation-logs/:id`)를 신설해 sticky 요약 바 + 아티팩트 타임라인 중심 레이아웃을 제공한다.

**Architecture:** 기존 `admin_get_generation_logs` RPC에 파라미터 4개를 추가해 단건 조회·필터링을 지원하고, 프론트엔드는 신규 detail 페이지와 query hook만 추가하며 기존 mapper/타입은 그대로 재사용한다.

**Tech Stack:** Supabase PostgreSQL RPC, React + TypeScript, Ant Design, TanStack Query, React Router (Refine)

**Design spec:** `docs/design/2026-04-23-generation-logs-design.md`

---

## File Map

### 신규 생성

| 파일                                                                                | 역할                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------ |
| `supabase/migrations/20260512000009_generation_logs_filter_and_detail.sql`          | RPC 파라미터 확장                    |
| `apps/admin/src/pages/generation-logs/detail.tsx`                                   | `/generation-logs/:id` 페이지 진입점 |
| `apps/admin/src/features/generation-logs/components/generation-log-detail-page.tsx` | 상세 페이지 전체 레이아웃            |

### 수정

| 파일                                                                          | 변경 내용                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/admin/src/features/generation-logs/api/generation-logs-api.ts`          | `getGenerationLogs` 파라미터 확장                                 |
| `apps/admin/src/features/generation-logs/api/generation-logs-query.ts`        | `useGenerationLogsQuery` 확장, `useGenerationLogDetailQuery` 추가 |
| `apps/admin/src/features/generation-logs/api/generation-logs-query.test.ts`   | 새 hook 계약 테스트 추가                                          |
| `apps/admin/src/features/generation-logs/components/generation-log-table.tsx` | 모달 제거, 행 클릭 → navigate                                     |
| `apps/admin/src/features/generation-logs/index.ts`                            | `useGenerationLogDetailQuery` 재수출                              |
| `apps/admin/src/pages/generation-logs/list.tsx`                               | 필터 상태 추가, 통계 접기 UI                                      |
| `apps/admin/src/App.tsx`                                                      | `/generation-logs/:id` 라우트 추가, Refine resource show 등록     |

---

## Task 1: DB — RPC 파라미터 확장

**Files:**

- Create: `supabase/migrations/20260512000009_generation_logs_filter_and_detail.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260512000009_generation_logs_filter_and_detail.sql

-- 기존 함수 제거 (grant 자동 해제)
drop function if exists public.admin_get_generation_logs(date, date, text, integer, integer);

-- 파라미터 4개 추가:
--   p_id          – 단건 조회 (상세 페이지용)
--   p_request_type – 요청 유형 필터
--   p_status      – 'success' | 'error' | null(전체)
--   p_id_search   – workflow_id 또는 work_id exact match
create function public.admin_get_generation_logs(
  p_start_date      date,
  p_end_date        date,
  p_ai_model        text    default null,
  p_limit           integer default 50,
  p_offset          integer default 0,
  p_id              uuid    default null,
  p_request_type    text    default null,
  p_status          text    default null,
  p_id_search       text    default null
)
returns table (
  id                          uuid,
  workflow_id                 text,
  phase                       text,
  work_id                     text,
  parent_work_id              text,
  user_id                     uuid,
  ai_model                    text,
  request_type                text,
  quality                     text,
  user_message                text,
  prompt_length               integer,
  request_attachments         jsonb,
  design_context              jsonb,
  normalized_design           jsonb,
  conversation_turn           integer,
  has_ci_image                boolean,
  has_reference_image         boolean,
  has_previous_image          boolean,
  generate_image              boolean,
  eligible_for_render         boolean,
  missing_requirements        jsonb,
  eligibility_reason          text,
  detected_design             jsonb,
  text_prompt                 text,
  image_prompt                text,
  image_edit_prompt           text,
  ai_message                  text,
  image_generated             boolean,
  generated_image_url         text,
  pattern_preparation_backend text,
  pattern_repair_prompt_kind  text,
  pattern_repair_applied      boolean,
  pattern_repair_reason_codes jsonb,
  prep_tokens_charged         integer,
  tokens_charged              integer,
  tokens_refunded             integer,
  text_latency_ms             integer,
  image_latency_ms            integer,
  total_latency_ms            integer,
  error_type                  text,
  error_message               text,
  created_at                  timestamptz
)
language plpgsql
security invoker
set search_path to public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id, l.user_id,
    l.ai_model, l.request_type, l.quality, l.user_message, l.prompt_length,
    l.request_attachments, l.design_context, l.normalized_design,
    l.conversation_turn, l.has_ci_image, l.has_reference_image,
    l.has_previous_image, l.generate_image, l.eligible_for_render,
    l.missing_requirements, l.eligibility_reason, l.detected_design,
    l.text_prompt, l.image_prompt, l.image_edit_prompt, l.ai_message,
    l.image_generated, l.generated_image_url, l.pattern_preparation_backend,
    l.pattern_repair_prompt_kind, l.pattern_repair_applied,
    l.pattern_repair_reason_codes, l.prep_tokens_charged,
    l.tokens_charged, l.tokens_refunded,
    l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
    l.error_type, l.error_message, l.created_at
  from public.ai_generation_logs l
  where l.created_at::date between p_start_date and p_end_date
    and (p_ai_model      is null or l.ai_model      = p_ai_model)
    and (p_id            is null or l.id            = p_id)
    and (p_request_type  is null or l.request_type  = p_request_type)
    and (p_status        is null
         or (p_status = 'success' and l.error_type is null)
         or (p_status = 'error'   and l.error_type is not null))
    and (p_id_search     is null
         or l.workflow_id = p_id_search
         or l.work_id     = p_id_search)
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

grant execute on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) to authenticated;
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
cd /Users/gimbongseob/git/YeongSeon
supabase db push
```

Expected: `Applied 1 migration` (또는 `Applying migration 20260512000009...`)

- [ ] **Step 3: RPC 동작 확인**

Supabase Dashboard > SQL Editor에서 아래 실행하거나 supabase CLI 사용:

```sql
-- 단건 조회 확인 (임의 id로 테스트)
select id, ai_model, request_type, error_type
from public.admin_get_generation_logs(
  '2020-01-01', '2099-12-31',
  null, 1, 0,
  null,          -- p_id: 실제 uuid로 교체해 테스트
  null, null, null
);

-- status 필터 확인
select count(*) from public.admin_get_generation_logs(
  '2020-01-01', '2099-12-31',
  null, 100, 0, null, null, 'success', null
);
```

Expected: 에러 없이 결과 반환, status='success'면 error_type IS NULL 행만 나옴.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260512000009_generation_logs_filter_and_detail.sql
git commit -m "feat(db): extend admin_get_generation_logs with filter and detail params"
```

---

## Task 2: API + Query Hook 확장

**Files:**

- Modify: `apps/admin/src/features/generation-logs/api/generation-logs-api.ts`
- Modify: `apps/admin/src/features/generation-logs/api/generation-logs-query.ts`
- Modify: `apps/admin/src/features/generation-logs/api/generation-logs-query.test.ts`
- Modify: `apps/admin/src/features/generation-logs/index.ts`

- [ ] **Step 1: `getGenerationLogs` 파라미터 확장 테스트 작성**

`apps/admin/src/features/generation-logs/api/generation-logs-query.test.ts`에 아래 describe 블록 추가 (기존 describe 아래에):

```typescript
describe("useGenerationLogsQuery — new filter params", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options) => ({
      data: undefined,
      isLoading: false,
      error: null,
      options,
    }));
  });

  it("requestType 필터를 queryKey와 queryFn에 전달한다", async () => {
    const getGenerationLogsMock = vi.fn().mockResolvedValue([]);
    vi.mocked(
      await import("@/features/generation-logs/api/generation-logs-api"),
    ).getGenerationLogs = getGenerationLogsMock;

    useGenerationLogsQuery({
      dateRange: [dayjs("2026-04-17"), dayjs("2026-04-23")],
      aiModel: null,
      page: 1,
      requestType: "analysis",
      status: null,
      idSearch: null,
    });

    const options = useQueryMock.mock.calls[0]?.[0];
    expect(options.queryKey).toContain("analysis");

    await options.queryFn();
    expect(getGenerationLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ requestType: "analysis" }),
    );
  });

  it("useGenerationLogDetailQuery는 p_id를 넘기고 결과 첫 번째 항목을 반환한다", async () => {
    const mockLog = {
      id: "uuid-1",
      aiModel: "openai",
    } as AdminGenerationLogItem;
    useQueryMock.mockImplementation((options) => ({
      data: [mockLog],
      isLoading: false,
      error: null,
      options,
    }));

    const result = useGenerationLogDetailQuery("uuid-1");
    expect(result.data).toEqual(mockLog);

    const options = useQueryMock.mock.calls[0]?.[0];
    expect(options.queryKey).toEqual(["generation-logs", "detail", "uuid-1"]);
  });
});
```

파일 상단에 import 추가:

```typescript
import dayjs from "dayjs";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";
import {
  useGenerationLogsQuery,
  useGenerationLogArtifactsQuery,
  useGenerationLogDetailQuery,
} from "@/features/generation-logs/api/generation-logs-query";
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd apps/admin
pnpm test generation-logs-query --run
```

Expected: FAIL — `useGenerationLogDetailQuery is not a function` 또는 `requestType` 관련 실패

- [ ] **Step 3: `generation-logs-api.ts` 파라미터 확장**

`apps/admin/src/features/generation-logs/api/generation-logs-api.ts`:

```typescript
import { supabase } from "@/lib/supabase";
import {
  toAdminGenerationLogItem,
  toGenerationStatsData,
} from "@/features/generation-logs/api/generation-logs-mapper";
import type {
  AdminGenerationLogItem,
  GenerationStatsData,
} from "@/features/generation-logs/types/admin-generation-log";

export async function getGenerationStats(
  startDate: string,
  endDate: string,
): Promise<GenerationStatsData> {
  const { data, error } = await supabase.rpc("admin_get_generation_stats", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return toGenerationStatsData(data);
}

export async function getGenerationLogs(params: {
  startDate: string;
  endDate: string;
  aiModel?: string | null;
  limit?: number;
  offset?: number;
  id?: string | null;
  requestType?: string | null;
  status?: string | null;
  idSearch?: string | null;
}): Promise<AdminGenerationLogItem[]> {
  const { data, error } = await supabase.rpc("admin_get_generation_logs", {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_ai_model: params.aiModel ?? null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
    p_id: params.id ?? null,
    p_request_type: params.requestType ?? null,
    p_status: params.status ?? null,
    p_id_search: params.idSearch ?? null,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return data.map(toAdminGenerationLogItem);
}
```

- [ ] **Step 4: `generation-logs-query.ts` 확장**

`apps/admin/src/features/generation-logs/api/generation-logs-query.ts` 전체 교체:

```typescript
import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import {
  getGenerationStats,
  getGenerationLogs,
} from "@/features/generation-logs/api/generation-logs-api";
import { getGenerationLogArtifacts } from "@/features/generation-logs/api/generation-log-artifacts-api";
import type {
  AdminGenerationLogItem,
  GenerationStatsData,
} from "@/features/generation-logs/types/admin-generation-log";
import type { AdminGenerationArtifactItem } from "@/features/generation-logs/types/admin-generation-artifact";

const PAGE_SIZE = 50;

export function useGenerationStatsQuery(dateRange: [Dayjs, Dayjs]): {
  data: GenerationStatsData | undefined;
  isLoading: boolean;
} {
  const startDate = dateRange[0].format("YYYY-MM-DD");
  const endDate = dateRange[1].format("YYYY-MM-DD");
  return useQuery({
    queryKey: ["generation-logs", "stats", startDate, endDate],
    queryFn: () => getGenerationStats(startDate, endDate),
  });
}

export function useGenerationLogsQuery(params: {
  dateRange: [Dayjs, Dayjs];
  aiModel: string | null;
  page: number;
  requestType?: string | null;
  status?: string | null;
  idSearch?: string | null;
}): {
  data: AdminGenerationLogItem[] | undefined;
  hasMore: boolean;
  isLoading: boolean;
} {
  const startDate = params.dateRange[0].format("YYYY-MM-DD");
  const endDate = params.dateRange[1].format("YYYY-MM-DD");
  const normalizedPage = Math.max(1, Math.floor(Number(params.page) || 1));

  const query = useQuery({
    queryKey: [
      "generation-logs",
      "list",
      startDate,
      endDate,
      params.aiModel,
      normalizedPage,
      params.requestType ?? null,
      params.status ?? null,
      params.idSearch ?? null,
    ],
    queryFn: () =>
      getGenerationLogs({
        startDate,
        endDate,
        aiModel: params.aiModel,
        limit: PAGE_SIZE + 1,
        offset: (normalizedPage - 1) * PAGE_SIZE,
        requestType: params.requestType ?? null,
        status: params.status ?? null,
        idSearch: params.idSearch ?? null,
      }),
  });

  const rawData = query.data;
  return {
    data: rawData?.slice(0, PAGE_SIZE),
    hasMore: (rawData?.length ?? 0) > PAGE_SIZE,
    isLoading: query.isLoading,
  };
}

export function useGenerationLogDetailQuery(id: string): {
  data: AdminGenerationLogItem | undefined;
  isLoading: boolean;
  errorMessage: string | null;
} {
  const query = useQuery({
    queryKey: ["generation-logs", "detail", id],
    queryFn: () =>
      getGenerationLogs({
        startDate: "2020-01-01",
        endDate: "2099-12-31",
        id,
        limit: 1,
        offset: 0,
      }),
    enabled: Boolean(id),
  });

  return {
    data: query.data?.[0],
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}

export function useGenerationLogArtifactsQuery(params: {
  workflowId: string | null | undefined;
}): {
  data: AdminGenerationArtifactItem[];
  isLoading: boolean;
  errorMessage: string | null;
} {
  const normalizedWorkflowId =
    typeof params.workflowId === "string" && params.workflowId.trim().length > 0
      ? params.workflowId.trim()
      : null;

  const query = useQuery({
    queryKey: ["generation-logs", "artifacts", normalizedWorkflowId],
    queryFn: () =>
      getGenerationLogArtifacts(
        normalizedWorkflowId === null ? "" : normalizedWorkflowId,
      ),
    enabled: normalizedWorkflowId !== null,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}

export { PAGE_SIZE as GENERATION_LOG_PAGE_SIZE };
```

- [ ] **Step 5: `index.ts`에 `useGenerationLogDetailQuery` 재수출 추가**

`apps/admin/src/features/generation-logs/index.ts`:

```typescript
export { GenerationLogTable } from "./components/generation-log-table";
export { GenerationLogStats } from "./components/generation-log-stats";
export { DesignContextStats } from "./components/design-context-stats";
export {
  useGenerationStatsQuery,
  useGenerationLogsQuery,
  useGenerationLogDetailQuery,
} from "./api/generation-logs-query";
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd apps/admin
pnpm test generation-logs-query --run
```

Expected: PASS (기존 artifact 테스트 + 신규 2개 모두 통과)

- [ ] **Step 7: 타입 체크**

```bash
cd /Users/gimbongseob/git/YeongSeon
pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add apps/admin/src/features/generation-logs/api/generation-logs-api.ts \
        apps/admin/src/features/generation-logs/api/generation-logs-query.ts \
        apps/admin/src/features/generation-logs/api/generation-logs-query.test.ts \
        apps/admin/src/features/generation-logs/index.ts
git commit -m "feat(admin): extend generation logs query with filter params and detail hook"
```

---

## Task 3: 라우터 — `/generation-logs/:id` 추가

**Files:**

- Create: `apps/admin/src/pages/generation-logs/detail.tsx`
- Modify: `apps/admin/src/App.tsx`

- [ ] **Step 1: 상세 페이지 진입점 파일 생성 (임시 placeholder)**

`apps/admin/src/pages/generation-logs/detail.tsx`:

```typescript
import { useParams } from "react-router-dom";
import { Spin, Typography } from "antd";

export default function GenerationLogDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <Typography.Text code>{id}</Typography.Text>
      <Spin style={{ marginLeft: 16 }} />
    </div>
  );
}
```

- [ ] **Step 2: App.tsx에 라우트 + Refine resource 추가**

`apps/admin/src/App.tsx`에서:

1. import 추가 (GenerationLogList import 바로 아래):

```typescript
import GenerationLogDetailPage from "@/pages/generation-logs/detail";
```

2. Refine resources에서 `ai_generation_logs` 항목을 찾아 `show` 추가:

```typescript
{
  name: "ai_generation_logs",
  list: "/generation-logs",
  show: "/generation-logs/:id",
  meta: { label: "AI 생성 로그", icon: <RobotOutlined /> },
},
```

3. Routes에 `/generation-logs` 라우트 다음에 추가:

```typescript
<Route path="/generation-logs/:id" element={<GenerationLogDetailPage />} />
```

- [ ] **Step 3: 동작 확인**

```bash
cd apps/admin && pnpm dev
```

브라우저에서 `http://localhost:5174/generation-logs/test-uuid` 접속.  
Expected: "test-uuid" 텍스트와 Spin이 보임 (에러 없음).

- [ ] **Step 4: 타입 체크**

```bash
cd /Users/gimbongseob/git/YeongSeon && pnpm type-check
```

- [ ] **Step 5: 커밋**

```bash
git add apps/admin/src/App.tsx apps/admin/src/pages/generation-logs/detail.tsx
git commit -m "feat(admin): add /generation-logs/:id route"
```

---

## Task 4: GenerationLogTable — 모달 제거, 행 클릭 navigate

**Files:**

- Modify: `apps/admin/src/features/generation-logs/components/generation-log-table.tsx`

- [ ] **Step 1: GenerationLogTable 수정**

`apps/admin/src/features/generation-logs/components/generation-log-table.tsx` 전체 교체:

```typescript
import { Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/api/generation-logs-query";
import { formatNullableLocaleNumber } from "@/utils/format-number";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const { Text } = Typography;

interface GenerationLogTableProps {
  data: AdminGenerationLogItem[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  aiModel: string | null;
  onAiModelChange: (model: string | null) => void;
}

const renderGenerateImageStatus = (
  generateImage: boolean | null | undefined,
  imageGenerated: boolean,
) => {
  if (!generateImage) return <Tag>미요청</Tag>;
  return imageGenerated ? <Tag color="success">성공</Tag> : <Tag>실패</Tag>;
};

export function GenerationLogTable({
  data,
  loading,
  page,
  hasMore,
  onPageChange,
  aiModel,
  onAiModelChange,
}: GenerationLogTableProps) {
  const navigate = useNavigate();

  const columns: ColumnsType<AdminGenerationLogItem> = [
    {
      title: "시각",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (v: string) => dayjs(v).format("MM-DD HH:mm:ss"),
    },
    {
      title: "모델",
      dataIndex: "aiModel",
      key: "aiModel",
      width: 80,
      render: (v: string) => {
        const color =
          v === "openai" ? "blue" : "purple";
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: "요청 유형",
      dataIndex: "requestType",
      key: "requestType",
      width: 120,
      render: (v: string | null) =>
        v === "analysis" ? "분석"
        : v === "prep" ? "보정"
        : v === "render_standard" ? "렌더(표준)"
        : v === "render_high" ? "렌더(고품질)"
        : "-",
    },
    {
      title: "프롬프트",
      dataIndex: "userMessage",
      key: "userMessage",
      ellipsis: true,
      render: (v: string) => (
        <Text ellipsis style={{ maxWidth: 240 }}>
          {v}
        </Text>
      ),
    },
    {
      title: "턴",
      dataIndex: "conversationTurn",
      key: "conversationTurn",
      width: 50,
      align: "right",
    },
    {
      title: "이미지",
      dataIndex: "imageGenerated",
      key: "imageGenerated",
      width: 70,
      align: "center",
      render: (v: boolean, record) =>
        renderGenerateImageStatus(record.generateImage, v),
    },
    {
      title: "토큰",
      key: "tokens",
      width: 90,
      align: "right",
      render: (_, record) => {
        const net = record.tokensCharged - record.tokensRefunded;
        return (
          <span>
            {net}
            {record.tokensRefunded > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {" "}
                (-{record.tokensRefunded})
              </Text>
            )}
          </span>
        );
      },
    },
    {
      title: "응답(ms)",
      dataIndex: "totalLatencyMs",
      key: "totalLatencyMs",
      width: 90,
      align: "right",
      render: (v: number | null) => formatNullableLocaleNumber(v),
    },
    {
      title: "상태",
      dataIndex: "errorType",
      key: "errorType",
      width: 90,
      render: (v: string | null) =>
        v ? <Tag color="error">{v}</Tag> : <Tag color="success">성공</Tag>,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="모든 모델"
          value={aiModel}
          onChange={onAiModelChange}
          allowClear
          style={{ width: 140 }}
          options={[
            { value: "openai", label: "OpenAI" },
            { value: "fal", label: "Fal.ai" },
          ]}
        />
      </Space>

      <Table<AdminGenerationLogItem>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        onRow={(record) => ({
          onClick: () => navigate(`/generation-logs/${record.id}`),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize: GENERATION_LOG_PAGE_SIZE,
          total: hasMore
            ? page * GENERATION_LOG_PAGE_SIZE + 1
            : (page - 1) * GENERATION_LOG_PAGE_SIZE + data.length,
          onChange: onPageChange,
          showSizeChanger: false,
          simple: true,
        }}
        scroll={{ x: 900 }}
      />
    </>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/gimbongseob/git/YeongSeon && pnpm type-check
```

Expected: 에러 없음 (Modal, Descriptions, List 관련 import도 정리됨)

- [ ] **Step 3: 동작 확인**

`http://localhost:5174/generation-logs` 접속 → 로그 행 클릭 → `/generation-logs/<id>` URL로 이동 확인.

- [ ] **Step 4: 커밋**

```bash
git add apps/admin/src/features/generation-logs/components/generation-log-table.tsx
git commit -m "feat(admin): replace generation log modal with navigate to detail page"
```

---

## Task 5: 리스트 페이지 — 필터 강화 + 통계 접기

**Files:**

- Modify: `apps/admin/src/pages/generation-logs/list.tsx`

- [ ] **Step 1: list.tsx 전체 교체**

```typescript
import { useState } from "react";
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import {
  DesignContextStats,
  GenerationLogStats,
  GenerationLogTable,
  useGenerationLogsQuery,
  useGenerationStatsQuery,
} from "@/features/generation-logs";

const EMPTY_SUMMARY = {
  totalRequests: 0,
  imageSuccessRate: 0,
  totalTokensConsumed: 0,
  avgTotalLatencyMs: 0,
};

export default function GenerationLogList() {
  const [dateRange, setDateRange] = useState<DateRange>([
    dayjs().subtract(6, "day"),
    dayjs(),
  ]);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [idSearch, setIdSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [statsOpen, setStatsOpen] = useState(false);

  const { data: statsData, isLoading: statsLoading } =
    useGenerationStatsQuery(dateRange);

  const { data: logsData, hasMore: logsHasMore, isLoading: logsLoading } =
    useGenerationLogsQuery({
      dateRange,
      aiModel,
      page,
      requestType,
      status,
      idSearch: idSearch.trim() || null,
    });

  const resetPage = () => setPage(1);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    resetPage();
  };
  const handleAiModelChange = (v: string | null) => { setAiModel(v); resetPage(); };
  const handleRequestTypeChange = (v: string | null) => { setRequestType(v); resetPage(); };
  const handleStatusChange = (v: string | null) => { setStatus(v); resetPage(); };
  const handleIdSearchChange = (v: string) => { setIdSearch(v); resetPage(); };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        AI 생성 로그
      </Typography.Title>

      <div style={{ marginBottom: 16 }}>
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      {statsLoading ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : (
        <GenerationLogStats stats={statsData?.summary ?? EMPTY_SUMMARY} />
      )}

      {/* 통계 패널 — 기본 접힘 */}
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 0 } }}
        extra={
          <Button
            type="link"
            size="small"
            icon={statsOpen ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setStatsOpen((v) => !v)}
          >
            {statsOpen ? "통계 접기" : "통계 펼치기"}
          </Button>
        }
        title={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            모델·패턴·에러 통계
          </Typography.Text>
        }
      >
        {statsOpen && (
          <div style={{ padding: 16 }}>
            <DesignContextStats
              byModel={statsData?.byModel ?? []}
              byInputType={statsData?.byInputType ?? []}
              byPattern={statsData?.byPattern ?? []}
              byError={statsData?.byError ?? []}
              loading={statsLoading}
            />
          </div>
        )}
      </Card>

      <Card>
        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          로그 목록
        </Typography.Title>

        {/* 필터 바 */}
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            placeholder="모든 요청 유형"
            value={requestType}
            onChange={handleRequestTypeChange}
            allowClear
            style={{ width: 150 }}
            options={[
              { value: "analysis", label: "분석" },
              { value: "prep", label: "보정" },
              { value: "render_standard", label: "렌더(표준)" },
              { value: "render_high", label: "렌더(고품질)" },
            ]}
          />
          <Select
            placeholder="모든 상태"
            value={status}
            onChange={handleStatusChange}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: "success", label: "성공" },
              { value: "error", label: "에러" },
            ]}
          />
          <Input.Search
            placeholder="workflow_id / work_id"
            value={idSearch}
            onChange={(e) => handleIdSearchChange(e.target.value)}
            onSearch={() => resetPage()}
            allowClear
            style={{ width: 220 }}
          />
        </Space>

        <GenerationLogTable
          data={logsData ?? []}
          loading={logsLoading}
          page={page}
          hasMore={logsHasMore}
          onPageChange={setPage}
          aiModel={aiModel}
          onAiModelChange={handleAiModelChange}
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/gimbongseob/git/YeongSeon && pnpm type-check
```

- [ ] **Step 3: 동작 확인**

`http://localhost:5174/generation-logs` 접속 후:

- "통계 펼치기" 버튼 클릭 → 통계 표시 확인
- 요청 유형 / 상태 / ID 검색 필터 동작 확인 (필터 변경 시 로그 목록 변경)
- 행 클릭 → 상세 페이지 이동 확인

- [ ] **Step 4: 커밋**

```bash
git add apps/admin/src/pages/generation-logs/list.tsx
git commit -m "feat(admin): add request type, status, id-search filters and collapsible stats to generation logs list"
```

---

## Task 6: 상세 페이지 — 전체 레이아웃 구현

**Files:**

- Create: `apps/admin/src/features/generation-logs/components/generation-log-detail-page.tsx`
- Modify: `apps/admin/src/pages/generation-logs/detail.tsx`

- [ ] **Step 1: `generation-log-detail-page.tsx` 생성**

`apps/admin/src/features/generation-logs/components/generation-log-detail-page.tsx`:

```typescript
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
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const { Text, Title } = Typography;

function requestTypeLabel(v: string | null) {
  if (v === "analysis") return "분석";
  if (v === "prep") return "보정";
  if (v === "render_standard") return "렌더(표준)";
  if (v === "render_high") return "렌더(고품질)";
  return "-";
}

function modelColor(model: string) {
  if (model === "openai") return "blue";
  return "purple";
}

// ── Sticky 요약 바 ─────────────────────────────────────────────
function StickyBar({ log, onBack }: { log: AdminGenerationLogItem; onBack: () => void }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
            style={{ fontSize: 11, marginLeft: "auto", fontFamily: "monospace" }}
          >
            workflow: {log.workflowId}
          </Text>
        )}
      </div>
    </div>
  );
}

// ── 섹션 1: 기본 정보 ──────────────────────────────────────────
function BasicInfoSection({ log }: { log: AdminGenerationLogItem }) {
  return (
    <Card title="기본 정보" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[8, 8]}>
        {[
          { label: "CI 이미지", value: log.hasCiImage ? "있음" : "없음" },
          { label: "레퍼런스 이미지", value: log.hasReferenceImage ? "있음" : "없음" },
          { label: "이전 이미지", value: log.hasPreviousImage ? "있음" : "없음" },
          { label: "대화 턴", value: String(log.conversationTurn) },
          { label: "프롬프트 길이", value: `${log.promptLength}자` },
          {
            label: "이미지 생성",
            value: !log.generateImage ? "미요청" : log.imageGenerated ? "성공" : "실패",
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
              <div style={{ fontSize: 11, color: "#999", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{value}</div>
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

// ── 섹션 2: 생성된 이미지 ──────────────────────────────────────
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

// ── 섹션 3: 아티팩트 타임라인 ─────────────────────────────────
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
          description="단일 렌더 로그는 workflow_id가 없습니다."
        />
      )}
    </Card>
  );
}

// ── 섹션 4: 프롬프트 & AI 응답 ────────────────────────────────
function ExpandableText({ label, content }: { label: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 300;
  const isLong = content.length > LIMIT;
  const displayed = expanded || !isLong ? content : content.slice(0, LIMIT) + "…";

  return (
    <div>
      <div style={{ fontSize: 11, color: "#999", marginBottom: 5, fontWeight: 600 }}>
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
              <ExpandableText label="image_edit_prompt" content={log.imageEditPrompt} />
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

// ── 섹션 5: 디자인 컨텍스트 ──────────────────────────────────
function DesignContextSection({ log }: { log: AdminGenerationLogItem }) {
  const hasContent =
    log.designContext ||
    log.detectedDesign ||
    log.normalizedDesign ||
    (Array.isArray(log.missingRequirements) && log.missingRequirements.length > 0) ||
    log.eligibilityReason;

  if (!hasContent) return null;

  return (
    <Card title="디자인 컨텍스트 & 감지 결과" size="small" style={{ marginBottom: 16 }}>
      {log.designContext && (
        <Descriptions column={4} size="small" bordered style={{ marginBottom: 10 }}>
          {Object.entries(log.designContext).map(([k, v]) =>
            v != null ? (
              <Descriptions.Item key={k} label={k}>
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </Descriptions.Item>
            ) : null,
          )}
        </Descriptions>
      )}
      {log.eligibilityReason && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>렌더 판정 사유</div>
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
          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>감지된 디자인 (raw)</div>
          <Text code style={{ fontSize: 11, whiteSpace: "pre-wrap", display: "block" }}>
            {JSON.stringify(log.detectedDesign, null, 2)}
          </Text>
        </div>
      )}
    </Card>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export function GenerationLogDetailPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: log, isLoading, errorMessage } = useGenerationLogDetailQuery(id);

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
```

- [ ] **Step 2: `detail.tsx` 페이지 진입점 완성**

`apps/admin/src/pages/generation-logs/detail.tsx` 전체 교체:

```typescript
import { useParams } from "react-router-dom";
import { Alert } from "antd";
import { GenerationLogDetailPage } from "@/features/generation-logs/components/generation-log-detail-page";

export default function GenerationLogDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="잘못된 접근: id가 없습니다." showIcon />
      </div>
    );
  }

  return <GenerationLogDetailPage id={id} />;
}
```

- [ ] **Step 3: 타입 체크**

```bash
cd /Users/gimbongseob/git/YeongSeon && pnpm type-check
```

Expected: 에러 없음

- [ ] **Step 4: 동작 확인**

`http://localhost:5174/generation-logs` 접속 후 로그 행 클릭.

확인 항목:

- Sticky 요약 바가 스크롤해도 상단에 고정됨
- "← AI 생성 로그" 클릭 시 리스트로 돌아옴
- 기본 정보 8칸 그리드 표시됨
- `generatedImageUrl`이 있는 로그에서는 이미지 표시
- `workflowId`가 있는 로그에서는 아티팩트 타임라인 표시
- `workflowId`가 없는 로그에서는 안내 문구 표시
- 프롬프트가 300자 초과 시 "더 보기" 링크 동작

- [ ] **Step 5: 커밋**

```bash
git add apps/admin/src/features/generation-logs/components/generation-log-detail-page.tsx \
        apps/admin/src/pages/generation-logs/detail.tsx
git commit -m "feat(admin): implement generation log detail page with sticky bar and artifact timeline"
```

---

## 완료 기준

- [ ] `/generation-logs` 리스트에서 요청 유형·상태·ID 필터 동작
- [ ] 통계 패널 기본 접힘, 버튼으로 펼침/접음
- [ ] 리스트 행 클릭 → `/generation-logs/:id` 이동
- [ ] 상세 페이지 sticky 요약 바 스크롤 고정
- [ ] 아티팩트 타임라인: workflowId 있으면 타임라인, 없으면 안내 문구
- [ ] 타입 체크 에러 없음 (`pnpm type-check`)
- [ ] 모든 테스트 통과 (`pnpm test --run`)
