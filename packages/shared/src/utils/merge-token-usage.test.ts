import { describe, expect, it } from "vitest";
import { extractBaseWorkId, mergeTokenUsageItems } from "./merge-token-usage";

describe("extractBaseWorkId", () => {
  it("_use_paid 접미사를 제거한다", () => {
    expect(extractBaseWorkId("work-abc_use_paid")).toBe("work-abc");
  });

  it("_use_bonus 접미사를 제거한다", () => {
    expect(extractBaseWorkId("work-abc_use_bonus")).toBe("work-abc");
  });

  it("접미사 없으면 원본을 반환한다", () => {
    expect(extractBaseWorkId("work-abc")).toBe("work-abc");
  });

  it("null이면 null을 반환한다", () => {
    expect(extractBaseWorkId(null)).toBeNull();
  });
});

describe("mergeTokenUsageItems", () => {
  it("같은 workId의 use/refund를 합산한다", () => {
    const items = [
      {
        id: "r1",
        amount: -100,
        type: "use",
        description: "사용",
        createdAt: "2024-01-01",
        workId: "work-1_use_paid",
      },
      {
        id: "r2",
        amount: 30,
        type: "refund",
        description: "환불",
        createdAt: "2024-01-02",
        workId: "work-1_use_paid",
      },
    ];

    const result = mergeTokenUsageItems(items);

    expect(result).toHaveLength(1);
    expect(result[0].netAmount).toBe(-70);
    expect(result[0].type).toBe("use");
  });

  it("workId 없는 항목은 standalone으로 포함한다", () => {
    const items = [
      {
        id: "g1",
        amount: 500,
        type: "grant",
        description: "지급",
        createdAt: "2024-01-01",
        workId: null,
      },
      {
        id: "g2",
        amount: -10,
        type: "refund",
        description: "환불",
        createdAt: "2024-01-02",
        workId: null,
      },
    ];

    const result = mergeTokenUsageItems(items);

    expect(result).toHaveLength(2);
  });

  it("createdAt 내림차순으로 정렬한다", () => {
    const items = [
      {
        id: "a",
        amount: 100,
        type: "grant",
        description: null,
        createdAt: "2024-01-01",
        workId: null,
      },
      {
        id: "b",
        amount: 200,
        type: "grant",
        description: null,
        createdAt: "2024-01-03",
        workId: null,
      },
    ];

    const result = mergeTokenUsageItems(items);

    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("a");
  });

  it("빈 배열이면 빈 배열을 반환한다", () => {
    expect(mergeTokenUsageItems([])).toEqual([]);
  });
});
