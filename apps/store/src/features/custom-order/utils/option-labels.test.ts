import { describe, expect, it } from "vitest";
import {
  getFabricLabel,
  getFinishingLabel,
  getInterliningLabel,
  getLabelOptionsLabel,
  getSampleTypeLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getTieTypeLabel,
} from "@/features/custom-order/utils/option-labels";

describe("option-labels", () => {
  it("원단 라벨 우선순위를 처리한다", () => {
    expect(
      getFabricLabel({
        fabricProvided: true,
        reorder: false,
        fabricType: null,
        designType: null,
      }),
    ).toBe("원단 직접 제공");
    expect(
      getFabricLabel({
        fabricProvided: false,
        reorder: true,
        fabricType: null,
        designType: null,
      }),
    ).toBe("재주문");
    expect(
      getFabricLabel({
        fabricProvided: false,
        reorder: false,
        fabricType: "SILK",
        designType: "YARN_DYED",
      }),
    ).toBe("실크 · 선염");
    expect(
      getFabricLabel(
        {
          fabricProvided: false,
          reorder: false,
          fabricType: null,
          designType: null,
        },
        "없음",
      ),
    ).toBe("없음");
  });

  it("타이/봉제/사이즈 라벨을 반환한다", () => {
    expect(getTieTypeLabel("AUTO")).toBe("자동 타이 (지퍼)");
    expect(getTieTypeLabel(null, true)).toBe("수동 타이");
    expect(
      getSewingStyleLabel({ dimple: true, spoderato: true, fold7: false }),
    ).toBe("딤플, 스포데라토");
    expect(
      getSewingStyleLabel({ dimple: false, spoderato: false, fold7: false }),
    ).toBe("일반");
    expect(getSizeLabel("CHILD")).toBe("아동용");
    expect(getSizeLabel("ADULT")).toBe("성인용");
    expect(getSizeLabel(null)).toBe("미선택");
  });

  it("심지/라벨/마감 라벨을 조합한다", () => {
    expect(
      getInterliningLabel({
        interlining: "WOOL",
        interliningThickness: "THIN",
      }),
    ).toBe("울 심지, 얇음");
    expect(
      getInterliningLabel({
        interlining: "WOOL",
        interliningThickness: "THICK",
      }),
    ).toBe("울 심지, 두꺼움");
    expect(getLabelOptionsLabel({ brandLabel: true, careLabel: true })).toBe(
      "브랜드 라벨, 케어 라벨",
    );
    expect(getLabelOptionsLabel({ brandLabel: false, careLabel: false })).toBe(
      "라벨 없음",
    );
    expect(
      getFinishingLabel({
        interlining: "WOOL",
        interliningThickness: "THIN",
        brandLabel: true,
        careLabel: false,
      }),
    ).toBe("울 심지, 얇음 · 브랜드 라벨");
  });

  it("샘플 타입 라벨을 반환한다", () => {
    expect(getSampleTypeLabel({ sample: false, sampleType: "sewing" })).toBe(
      null,
    );
    expect(getSampleTypeLabel({ sample: true, sampleType: "sewing" })).toBe(
      "봉제 샘플",
    );
    expect(getSampleTypeLabel({ sample: true, sampleType: "fabric" })).toBe(
      "원단 샘플",
    );
    expect(
      getSampleTypeLabel({ sample: true, sampleType: "fabric_and_sewing" }),
    ).toBe("원단 + 봉제 샘플");
  });
});
