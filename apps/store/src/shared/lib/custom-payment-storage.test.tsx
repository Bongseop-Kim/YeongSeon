import { beforeEach, describe, expect, it } from "vitest";
import {
  saveCustomPaymentState,
  removeCustomPaymentState,
} from "@/shared/lib/custom-payment-storage";
import type { CustomPaymentState } from "@/shared/lib/custom-payment-state";

const STORAGE_KEY = "customPaymentState";

const sampleState: CustomPaymentState = {
  orderType: "custom",
  imageRefs: [],
  additionalNotes: "",
  totalCost: 50000,
  coreOptions: {
    fabricProvided: false,
    reorder: false,
    fabricType: "SILK",
    designType: "PRINTING",
    tieType: "AUTO",
    interlining: "WOOL",
    interliningThickness: "THICK",
    sizeType: "ADULT",
    tieWidth: 8,
    triangleStitch: true,
    sideStitch: false,
    barTack: true,
    fold7: false,
    dimple: true,
    spoderato: false,
    brandLabel: true,
    careLabel: true,
    quantity: 10,
  },
};

beforeEach(() => {
  sessionStorage.clear();
});

describe("saveCustomPaymentState", () => {
  it("상태를 JSON 직렬화하여 'customPaymentState' 키로 저장한다", () => {
    saveCustomPaymentState(sampleState);

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify(sampleState),
    );
  });

  it("다른 상태로 재저장하면 값이 덮어써진다", () => {
    const updatedState: CustomPaymentState = {
      ...sampleState,
      totalCost: 99000,
    };

    saveCustomPaymentState(sampleState);
    saveCustomPaymentState(updatedState);

    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.totalCost).toBe(99000);
  });
});

describe("removeCustomPaymentState", () => {
  it("'customPaymentState' 키를 sessionStorage에서 제거한다", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sampleState));

    removeCustomPaymentState();

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("키가 없어도 에러 없이 동작한다", () => {
    expect(() => removeCustomPaymentState()).not.toThrow();
  });
});
