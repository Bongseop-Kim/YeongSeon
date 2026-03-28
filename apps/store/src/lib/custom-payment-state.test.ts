import { describe, expect, it } from "vitest";
import { isCustomPaymentState } from "@/lib/custom-payment-state";

const baseImageRef = { url: "https://example.com/img.jpg", fileId: "abc123" };

const validCustomState = {
  orderType: "custom" as const,
  imageRefs: [baseImageRef],
  additionalNotes: "메모",
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

const validSampleState = {
  orderType: "sample" as const,
  imageRefs: [baseImageRef],
  additionalNotes: "",
  sampleType: "fabric" as const,
  samplePrice: 30000,
  sampleLabel: "실크 샘플",
  fabricLabel: "실크",
  options: {
    fabricType: "SILK",
    designType: null,
    tieType: null,
    interlining: null,
  },
};

describe("isCustomPaymentState", () => {
  it("유효한 custom 주문 상태를 인식한다", () => {
    expect(isCustomPaymentState(validCustomState)).toBe(true);
  });

  it("유효한 sample 주문 상태를 인식한다", () => {
    expect(isCustomPaymentState(validSampleState)).toBe(true);
  });

  it("shippingAddressId가 있어도 유효하다", () => {
    expect(
      isCustomPaymentState({
        ...validCustomState,
        shippingAddressId: "addr-1",
      }),
    ).toBe(true);
  });

  it("null / undefined / 원시값은 false", () => {
    expect(isCustomPaymentState(null)).toBe(false);
    expect(isCustomPaymentState(undefined)).toBe(false);
    expect(isCustomPaymentState("string")).toBe(false);
    expect(isCustomPaymentState(42)).toBe(false);
  });

  it("imageRefs 원소에 url이 없으면 false", () => {
    expect(
      isCustomPaymentState({
        ...validCustomState,
        imageRefs: [{ fileId: "abc" }],
      }),
    ).toBe(false);
  });

  it("imageRefs가 배열이 아니면 false", () => {
    expect(
      isCustomPaymentState({ ...validCustomState, imageRefs: "not-array" }),
    ).toBe(false);
  });

  it("additionalNotes가 문자열이 아니면 false", () => {
    expect(
      isCustomPaymentState({ ...validCustomState, additionalNotes: 123 }),
    ).toBe(false);
  });

  it("shippingAddressId가 숫자면 false", () => {
    expect(
      isCustomPaymentState({ ...validCustomState, shippingAddressId: 999 }),
    ).toBe(false);
  });

  it("알 수 없는 orderType이면 false", () => {
    expect(
      isCustomPaymentState({ ...validCustomState, orderType: "unknown" }),
    ).toBe(false);
  });

  it("custom 상태에서 totalCost가 없으면 false", () => {
    const { totalCost: _, ...rest } = validCustomState;
    expect(isCustomPaymentState(rest)).toBe(false);
  });

  it("custom 상태에서 coreOptions.quantity가 문자열이면 false", () => {
    expect(
      isCustomPaymentState({
        ...validCustomState,
        coreOptions: { ...validCustomState.coreOptions, quantity: "ten" },
      }),
    ).toBe(false);
  });

  it("custom 상태에서 허용되지 않은 enum 값이면 false", () => {
    expect(
      isCustomPaymentState({
        ...validCustomState,
        coreOptions: {
          ...validCustomState.coreOptions,
          tieType: "STANDARD",
        },
      }),
    ).toBe(false);
  });

  it("sample 상태에서 sampleType이 잘못되면 false", () => {
    expect(
      isCustomPaymentState({ ...validSampleState, sampleType: "invalid" }),
    ).toBe(false);
  });

  it("sample 상태에서 samplePrice가 없으면 false", () => {
    const { samplePrice: _, ...rest } = validSampleState;
    expect(isCustomPaymentState(rest)).toBe(false);
  });

  it("sample 상태에서 허용되지 않은 enum 값이면 false", () => {
    expect(
      isCustomPaymentState({
        ...validSampleState,
        options: {
          ...validSampleState.options,
          interlining: "COTTON",
        },
      }),
    ).toBe(false);
  });
});
