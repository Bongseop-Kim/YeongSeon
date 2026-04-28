import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDesignSessions } from "@/entities/design/api/design-session-api";

const { fromMock, query } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);

  return {
    fromMock: vi.fn(() => query),
    query,
  };
});

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

describe("getDesignSessions", () => {
  beforeEach(() => {
    fromMock.mockClear();
    query.select.mockClear();
    query.not.mockClear();
    query.order.mockClear();
    query.select.mockReturnValue(query);
    query.not.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [], error: null });
  });

  it("generate-tile 세션만 기록 목록에 조회한다", async () => {
    await getDesignSessions();

    expect(fromMock).toHaveBeenCalledWith("design_chat_sessions");
    expect(query.not).toHaveBeenCalledWith("repeat_tile_url", "is", null);
    expect(query.not).toHaveBeenCalledWith("repeat_tile_work_id", "is", null);
  });
});
