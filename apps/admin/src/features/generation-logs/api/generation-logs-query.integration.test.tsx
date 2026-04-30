import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGenerationLogsQuery } from "@/features/generation-logs/api/generation-logs-query";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/constants";
import type { AdminGenerationLogGroup } from "@/features/generation-logs/types/admin-generation-log";

const { getGenerationLogGroupsMock } = vi.hoisted(() => ({
  getGenerationLogGroupsMock: vi.fn(),
}));

vi.mock("@/features/generation-logs/api/generation-logs-api", () => ({
  getGenerationStats: vi.fn(),
  getGenerationLogGroups: getGenerationLogGroupsMock,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createGroup(id: string): AdminGenerationLogGroup {
  return {
    workflowId: `workflow-${id}`,
    primaryLogId: id,
    primaryWorkId: `work-${id}`,
    userId: "user-1",
    aiModel: "openai",
    requestType: "render_standard",
    userMessage: "message",
    patternType: null,
    fabricType: null,
    imageCount: 4,
    successCount: 4,
    errorCount: 0,
    tokensCharged: 0,
    tokensRefunded: 0,
    totalLatencyMs: null,
    createdAt: "2026-04-17T00:00:00Z",
    resultImages: [],
  };
}

describe("generation logs query integration", () => {
  beforeEach(() => {
    getGenerationLogGroupsMock.mockReset();
  });

  it("formats dayjs filters for the API and slices the overfetched page", async () => {
    const logs = Array.from({ length: GENERATION_LOG_PAGE_SIZE + 1 }, (_, i) =>
      createGroup(`log-${i}`),
    );
    getGenerationLogGroupsMock.mockResolvedValue(logs);

    const { result } = renderHook(
      () =>
        useGenerationLogsQuery({
          dateRange: [dayjs("2026-04-17"), dayjs("2026-04-23")],
          aiModel: null,
          page: 1,
          requestType: "render_standard",
          status: "success",
          idSearch: "workflow-1",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(GENERATION_LOG_PAGE_SIZE);
    });

    expect(result.current.hasMore).toBe(true);
    expect(getGenerationLogGroupsMock).toHaveBeenCalledWith({
      startDate: "2026-04-17",
      endDate: "2026-04-23",
      aiModel: null,
      limit: GENERATION_LOG_PAGE_SIZE + 1,
      offset: 0,
      requestType: "render_standard",
      status: "success",
      idSearch: "workflow-1",
    });
  });
});
