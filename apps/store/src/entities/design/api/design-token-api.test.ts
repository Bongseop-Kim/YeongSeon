import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDesignTokenHistory } from "@/entities/design/api/design-token-api";

const { fromMock, query } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    in: vi.fn(),
    ilike: vi.fn(),
    range: vi.fn(),
  };

  for (const key of ["select", "order", "gte", "lt", "in", "ilike"] as const) {
    query[key].mockReturnValue(query);
  }

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

describe("getDesignTokenHistory", () => {
  beforeEach(() => {
    fromMock.mockClear();
    for (const mock of Object.values(query)) {
      mock.mockClear();
    }
    for (const key of [
      "select",
      "order",
      "gte",
      "lt",
      "in",
      "ilike",
    ] as const) {
      query[key].mockReturnValue(query);
    }
    query.range.mockResolvedValue({ data: [], error: null });
  });

  it("type, keyword, KST date bounds를 서버 쿼리에 반영한다", async () => {
    await getDesignTokenHistory({
      limit: 50,
      offset: 0,
      dateFrom: "2026-04-27",
      dateTo: "2026-04-27",
      types: ["use", "refund"],
      keyword: "stripe",
    });

    expect(fromMock).toHaveBeenCalledWith("design_tokens");
    expect(query.in).toHaveBeenCalledWith("type", ["use", "refund"]);
    expect(query.ilike).toHaveBeenCalledWith("description", "%stripe%");
    expect(query.gte).toHaveBeenCalledWith(
      "created_at",
      "2026-04-26T15:00:00.000Z",
    );
    expect(query.lt).toHaveBeenCalledWith(
      "created_at",
      "2026-04-27T15:00:00.000Z",
    );
  });

  it("필터가 없으면 gte/lt/in/ilike를 호출하지 않는다", async () => {
    await getDesignTokenHistory({ limit: 50, offset: 0 });

    expect(query.gte).not.toHaveBeenCalled();
    expect(query.lt).not.toHaveBeenCalled();
    expect(query.in).not.toHaveBeenCalled();
    expect(query.ilike).not.toHaveBeenCalled();
  });

  it("types 배열이 비어 있으면 in을 호출하지 않는다", async () => {
    await getDesignTokenHistory({ limit: 50, offset: 0, types: [] });

    expect(query.in).not.toHaveBeenCalled();
  });

  it("keyword가 공백뿐이면 ilike를 호출하지 않는다", async () => {
    await getDesignTokenHistory({ limit: 50, offset: 0, keyword: "   " });

    expect(query.ilike).not.toHaveBeenCalled();
  });

  it("keyword의 ilike 와일드카드(%, _, \\)를 이스케이프한다", async () => {
    await getDesignTokenHistory({
      limit: 50,
      offset: 0,
      keyword: "100% off_a\\b",
    });

    expect(query.ilike).toHaveBeenCalledWith(
      "description",
      "%100\\% off\\_a\\\\b%",
    );
  });
});
