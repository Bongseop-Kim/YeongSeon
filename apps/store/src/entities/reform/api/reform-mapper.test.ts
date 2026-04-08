import { describe, expect, it, vi } from "vitest";
import { toReformCartItems, toReformData } from "@/entities/reform";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";

vi.mock("@/shared/lib/utils", () => ({
  generateItemId: vi.fn((type: string, id: string) => `${type}-${id}`),
}));

const PRICING = { baseCost: 15000, widthReformCost: 10000 };

describe("toReformCartItems", () => {
  it("빈 tie 목록이면 빈 배열을 반환한다", () => {
    expect(toReformCartItems([], PRICING)).toEqual([]);
  });

  it("자동수선만 선택된 tie는 baseCost만 부과한다", () => {
    const result = toReformCartItems(
      [
        {
          id: "tie-1",
          measurementType: "length",
          tieLength: 51,
          hasLengthReform: true,
          hasWidthReform: false,
        },
      ],
      PRICING,
    );

    expect((result[0] as ReformCartItem).reformData.cost).toBe(15000);
  });

  it("폭수선만 선택된 tie는 widthReformCost만 부과한다", () => {
    const result = toReformCartItems(
      [
        {
          id: "tie-1",
          targetWidth: 9,
          hasLengthReform: false,
          hasWidthReform: true,
        },
      ],
      PRICING,
    );

    expect((result[0] as ReformCartItem).reformData.cost).toBe(10000);
  });

  it("자동수선+폭수선 모두 선택된 tie는 두 비용을 합산한다", () => {
    const result = toReformCartItems(
      [
        {
          id: "tie-1",
          measurementType: "length",
          tieLength: 51,
          targetWidth: 9,
          hasLengthReform: true,
          hasWidthReform: true,
        },
      ],
      PRICING,
    );

    expect((result[0] as ReformCartItem).reformData.cost).toBe(25000);
  });

  it("hasLengthReform이 없는 기존 데이터는 자동수선 활성으로 간주한다", () => {
    const result = toReformCartItems(
      [{ id: "tie-1", measurementType: "length", tieLength: 51 }],
      PRICING,
    );

    expect((result[0] as ReformCartItem).reformData.cost).toBe(15000);
  });

  it("tie 목록을 reform cart item 배열로 변환한다", () => {
    const ties = [
      {
        id: "tie-1",
        measurementType: "length" as const,
        tieLength: 145,
        hasLengthReform: true,
        hasWidthReform: false,
      },
      {
        id: "tie-2",
        measurementType: "height" as const,
        wearerHeight: 180,
        hasLengthReform: true,
        hasWidthReform: false,
      },
    ];

    expect(toReformCartItems(ties, PRICING)).toEqual([
      {
        id: "reform-tie-1",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: ties[0],
          cost: 15000,
        },
      },
      {
        id: "reform-tie-2",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: ties[1],
          cost: 15000,
        },
      },
    ]);
  });
});

describe("toReformData", () => {
  it("자동수선만: tie와 baseCost를 reformData로 묶는다", () => {
    const tie = {
      id: "tie-1",
      measurementType: "length" as const,
      tieLength: 145,
      hasLengthReform: true,
      hasWidthReform: false,
    };

    expect(toReformData(tie, PRICING)).toEqual({ tie, cost: 15000 });
  });

  it("폭수선만: widthReformCost만 부과한다", () => {
    const tie = {
      id: "tie-1",
      targetWidth: 9,
      hasLengthReform: false,
      hasWidthReform: true,
    };

    expect(toReformData(tie, PRICING)).toEqual({ tie, cost: 10000 });
  });

  it("자동+폭수선: 합산 비용을 반환한다", () => {
    const tie = {
      id: "tie-1",
      measurementType: "length" as const,
      tieLength: 51,
      targetWidth: 9,
      hasLengthReform: true,
      hasWidthReform: true,
    };

    expect(toReformData(tie, PRICING)).toEqual({ tie, cost: 25000 });
  });

  it("기존 자동수선 데이터도 정상 비용을 계산한다", () => {
    expect(
      toReformData(
        { id: "tie-1", measurementType: "length", tieLength: 145 },
        PRICING,
      ),
    ).toEqual({
      tie: { id: "tie-1", measurementType: "length", tieLength: 145 },
      cost: 15000,
    });
  });
});
