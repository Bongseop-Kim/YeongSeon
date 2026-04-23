import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";
import {
  useGenerationLogsQuery,
  useGenerationLogArtifactsQuery,
  useGenerationLogDetailQuery,
} from "@/features/generation-logs/api/generation-logs-query";

const { useQueryMock, getGenerationLogArtifactsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  getGenerationLogArtifactsMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("@/features/generation-logs/api/generation-log-artifacts-api", () => ({
  getGenerationLogArtifacts: getGenerationLogArtifactsMock,
}));

vi.mock("@/features/generation-logs/api/generation-logs-api", () => ({
  getGenerationStats: vi.fn(),
  getGenerationLogs: vi.fn(),
}));

describe("generation logs artifact query contract", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    getGenerationLogArtifactsMock.mockReset();
    useQueryMock.mockImplementation((options) => ({
      data: [],
      isLoading: false,
      error: null,
      options,
    }));
  });

  it("workflowId 앞뒤 공백을 query key와 fetch 인자에 동일하게 정규화한다", async () => {
    useGenerationLogArtifactsQuery({
      workflowId: "  workflow-1  ",
    });

    const options = useQueryMock.mock.calls[0]?.[0];

    expect(options.queryKey).toEqual([
      "generation-logs",
      "artifacts",
      "workflow-1",
    ]);

    await options.queryFn();

    expect(getGenerationLogArtifactsMock).toHaveBeenCalledWith("workflow-1");
    expect(options.enabled).toBe(true);
  });
});

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

  it("requestType이 queryKey에 포함된다", () => {
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
  });

  it("status가 queryKey에 포함된다", () => {
    useGenerationLogsQuery({
      dateRange: [dayjs("2026-04-17"), dayjs("2026-04-23")],
      aiModel: null,
      page: 1,
      requestType: null,
      status: "success",
      idSearch: null,
    });

    const options = useQueryMock.mock.calls[0]?.[0];
    expect(options.queryKey).toContain("success");
  });
});

describe("useGenerationLogDetailQuery", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  it("data[0]을 반환하고 queryKey가 ['generation-logs', 'detail', id]이다", () => {
    const mockLog = {
      id: "uuid-1",
      aiModel: "openai",
    } as AdminGenerationLogItem;
    useQueryMock.mockImplementation(() => ({
      data: [mockLog],
      isLoading: false,
      error: null,
    }));

    const result = useGenerationLogDetailQuery("uuid-1");

    expect(result.data).toEqual(mockLog);

    const options = useQueryMock.mock.calls[0]?.[0];
    expect(options.queryKey).toEqual(["generation-logs", "detail", "uuid-1"]);
  });

  it("id가 빈 문자열이면 enabled: false이다", () => {
    useQueryMock.mockImplementation((options) => ({
      data: undefined,
      isLoading: false,
      error: null,
      options,
    }));

    useGenerationLogDetailQuery("");

    const options = useQueryMock.mock.calls[0]?.[0];
    expect(options.enabled).toBe(false);
  });
});
