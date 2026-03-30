import { describe, expect, it, vi } from "vitest";
import { toReformCartItems, toReformData } from "@/entities/reform";

vi.mock("@/shared/lib/utils", () => ({
  generateItemId: vi.fn((type: string, id: string) => `${type}-${id}`),
}));

describe("toReformCartItems", () => {
  it("빈 tie 목록이면 빈 배열을 반환한다", () => {
    expect(toReformCartItems([], 0)).toEqual([]);
  });

  it("tie 목록을 reform cart item 배열로 변환한다", () => {
    expect(
      toReformCartItems(
        [
          { id: "tie-1", measurementType: "length", tieLength: 145 },
          { id: "tie-2", measurementType: "height", wearerHeight: 180 },
        ],
        15000,
      ),
    ).toEqual([
      {
        id: "reform-tie-1",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: { id: "tie-1", measurementType: "length", tieLength: 145 },
          cost: 15000,
        },
      },
      {
        id: "reform-tie-2",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: { id: "tie-2", measurementType: "height", wearerHeight: 180 },
          cost: 15000,
        },
      },
    ]);
  });
});

describe("toReformData", () => {
  it("tie와 cost를 reformData로 묶는다", () => {
    expect(
      toReformData(
        { id: "tie-1", measurementType: "length", tieLength: 145 },
        12000,
      ),
    ).toEqual({
      tie: { id: "tie-1", measurementType: "length", tieLength: 145 },
      cost: 12000,
    });
  });
});
