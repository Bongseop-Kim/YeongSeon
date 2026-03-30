import { describe, expect, it } from "vitest";
import {
  CUSTOM_DELIVERY_REQUEST,
  getDeliveryRequestLabel,
} from "./delivery-request-options";

describe("getDeliveryRequestLabel", () => {
  it("알려진 배송요청 코드를 한글 레이블로 변환한다", () => {
    expect(getDeliveryRequestLabel("DELIVERY_REQUEST_4")).toBe(
      "배송 전에 연락 주세요.",
    );
  });

  it("직접입력 코드는 메모를 우선 사용한다", () => {
    expect(
      getDeliveryRequestLabel(
        CUSTOM_DELIVERY_REQUEST,
        "부재 시 문고리에 걸어주세요.",
      ),
    ).toBe("부재 시 문고리에 걸어주세요.");
  });

  it("직접입력 메모가 없으면 기본 레이블을 사용한다", () => {
    expect(getDeliveryRequestLabel(CUSTOM_DELIVERY_REQUEST)).toBe("직접입력");
  });

  it("알 수 없는 값은 그대로 반환한다", () => {
    expect(getDeliveryRequestLabel("경비실 호출")).toBe("경비실 호출");
  });
});
