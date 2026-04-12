import type { OrderOptions } from "@/entities/custom-order";
import { useCustomOrderSummaryRows } from "./useCustomOrderSummaryRows";

const makeOptions = (overrides?: Partial<OrderOptions>): OrderOptions =>
  ({
    fabricProvided: false,
    reorder: false,
    fabricType: "POLY",
    designType: "PRINTING",
    tieType: "AUTO",
    interlining: "WOOL",
    interliningThickness: "THICK",
    sizeType: "ADULT",
    tieWidth: 8,
    triangleStitch: true,
    sideStitch: true,
    barTack: false,
    fold7: false,
    dimple: false,
    spoderato: false,
    brandLabel: false,
    careLabel: false,
    quantity: 10,
    referenceImages: null,
    additionalNotes: "",
    contactName: "",
    contactTitle: "",
    contactMethod: "phone",
    contactValue: "",
    ...overrides,
  }) as OrderOptions;

describe("useCustomOrderSummaryRows", () => {
  it("원단·봉제·수량 3개 행을 반환한다", () => {
    const result = useCustomOrderSummaryRows(makeOptions());

    expect(result).toHaveLength(3);
    expect(result[0]?.label).toBe("원단");
    expect(result[1]?.label).toBe("봉제");
    expect(result[2]?.label).toBe("수량");
  });

  it("폴리 날염 선택 시 원단 라벨이 '폴리 · 날염'이다", () => {
    const result = useCustomOrderSummaryRows(
      makeOptions({ fabricType: "POLY", designType: "PRINTING" }),
    );

    expect(result[0]?.value).toBe("폴리 · 날염");
  });

  it("원단 직접 제공 시 '원단 직접 제공'을 반환한다", () => {
    const result = useCustomOrderSummaryRows(
      makeOptions({ fabricProvided: true }),
    );

    expect(result[0]?.value).toBe("원단 직접 제공");
  });

  it("수량이 rows에 반영된다", () => {
    const result = useCustomOrderSummaryRows(makeOptions({ quantity: 50 }));

    expect(result[2]?.value).toBe("50개");
  });
});
