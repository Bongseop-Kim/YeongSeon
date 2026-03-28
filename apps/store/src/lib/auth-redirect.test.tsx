import { describe, expect, it, beforeEach } from "vitest";
import {
  consumeAuthRedirect,
  AUTH_REDIRECT_STORAGE_KEY,
} from "@/lib/auth-redirect";
import { ROUTES } from "@/constants/ROUTES";

const STATE_KEY = "customPaymentState";

beforeEach(() => {
  sessionStorage.clear();
});

describe("consumeAuthRedirect", () => {
  it("저장된 redirectPath가 없으면 null을 반환한다", () => {
    expect(consumeAuthRedirect()).toBeNull();
  });

  it("일반 redirectPath를 반환하고 sessionStorage에서 제거한다", () => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, "/orders");

    const result = consumeAuthRedirect();

    expect(result).toEqual({ redirectPath: "/orders" });
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBeNull();
  });

  it("CUSTOM_PAYMENT 경로이고 state가 없으면 state 없이 반환한다", () => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, ROUTES.CUSTOM_PAYMENT);

    const result = consumeAuthRedirect();

    expect(result).toEqual({ redirectPath: ROUTES.CUSTOM_PAYMENT });
  });

  it("CUSTOM_PAYMENT 경로이고 유효한 state가 있으면 state를 함께 반환한다", () => {
    const state = {
      orderType: "custom",
      imageRefs: [{ url: "https://example.com/img.jpg", fileId: "abc" }],
      additionalNotes: "",
      totalCost: 50000,
      coreOptions: {
        fabricProvided: false,
        reorder: false,
        fabricType: "SILK",
        designType: "PRINTING",
        tieType: "STANDARD",
        interlining: "WOOL",
        interliningThickness: "STANDARD",
        sizeType: "STANDARD",
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
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, ROUTES.CUSTOM_PAYMENT);
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));

    const result = consumeAuthRedirect();

    expect(result?.redirectPath).toBe(ROUTES.CUSTOM_PAYMENT);
    expect(result?.state).toEqual(state);
    expect(sessionStorage.getItem(STATE_KEY)).toBeNull();
  });

  it("CUSTOM_PAYMENT 경로이고 state JSON이 유효하지 않으면 state 없이 반환한다", () => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, ROUTES.CUSTOM_PAYMENT);
    sessionStorage.setItem(STATE_KEY, "invalid-json{{{");

    const result = consumeAuthRedirect();

    expect(result).toEqual({ redirectPath: ROUTES.CUSTOM_PAYMENT });
  });

  it("CUSTOM_PAYMENT 경로이고 state가 타입 가드를 통과하지 못하면 state가 undefined", () => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, ROUTES.CUSTOM_PAYMENT);
    sessionStorage.setItem(STATE_KEY, JSON.stringify({ orderType: "unknown" }));

    const result = consumeAuthRedirect();

    expect(result?.state).toBeUndefined();
  });

  it("호출 후 AUTH_REDIRECT_STORAGE_KEY와 STATE_KEY가 모두 제거된다", () => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, ROUTES.CUSTOM_PAYMENT);
    sessionStorage.setItem(STATE_KEY, JSON.stringify({ orderType: "invalid" }));

    consumeAuthRedirect();

    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(STATE_KEY)).toBeNull();
  });
});
