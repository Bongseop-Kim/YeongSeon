import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GENERATION_LOG_PAGE_SIZE,
  useGenerationLogArtifactsQuery,
  useGenerationLogsQuery,
} from "@/features/generation-logs/api/generation-logs-query";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const { getGenerationLogArtifactsMock, getGenerationLogsMock } = vi.hoisted(
  () => ({
    getGenerationLogArtifactsMock: vi.fn(),
    getGenerationLogsMock: vi.fn(),
  }),
);

vi.mock("@/features/generation-logs/api/generation-log-artifacts-api", () => ({
  getGenerationLogArtifacts: getGenerationLogArtifactsMock,
}));

vi.mock("@/features/generation-logs/api/generation-logs-api", () => ({
  getGenerationStats: vi.fn(),
  getGenerationLogs: getGenerationLogsMock,
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

function createLog(id: string): AdminGenerationLogItem {
  return {
    id,
    workId: `work-${id}`,
    userId: "user-1",
    aiModel: "openai",
    requestType: "render_standard",
    quality: "standard",
    userMessage: "message",
    promptLength: 1,
    designContext: null,
    conversationTurn: 1,
    hasCiImage: false,
    hasReferenceImage: false,
    hasPreviousImage: false,
    aiMessage: null,
    generateImage: true,
    imageGenerated: true,
    generatedImageUrl: null,
    requestAttachments: null,
    detectedDesign: null,
    tokensCharged: 0,
    tokensRefunded: 0,
    textLatencyMs: null,
    imageLatencyMs: null,
    totalLatencyMs: null,
    errorType: null,
    createdAt: "2026-04-17T00:00:00Z",
  };
}

describe("generation logs query integration", () => {
  beforeEach(() => {
    getGenerationLogArtifactsMock.mockReset();
    getGenerationLogsMock.mockReset();
  });

  it("disabled artifact query does not call the API", () => {
    const { result } = renderHook(
      () => useGenerationLogArtifactsQuery({ workflowId: "   " }),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(getGenerationLogArtifactsMock).not.toHaveBeenCalled();
  });

  it("formats dayjs filters for the API and slices the overfetched page", async () => {
    const logs = Array.from({ length: GENERATION_LOG_PAGE_SIZE + 1 }, (_, i) =>
      createLog(`log-${i}`),
    );
    getGenerationLogsMock.mockResolvedValue(logs);

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
    expect(getGenerationLogsMock).toHaveBeenCalledWith({
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
