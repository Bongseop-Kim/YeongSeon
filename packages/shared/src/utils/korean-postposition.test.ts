import { describe, expect, it } from "vitest";
import { eulo } from "@/utils/korean-postposition";

describe("eulo", () => {
  it("받침이 없으면 로를 반환한다", () => {
    expect(eulo("바다")).toBe("로");
  });

  it("일반 받침이 있으면 으로를 반환한다", () => {
    expect(eulo("집")).toBe("으로");
  });

  it("ㄹ 받침이면 로를 반환한다", () => {
    expect(eulo("서울")).toBe("로");
  });

  it("비한글 입력은 안전 폴백으로 으로를 반환한다", () => {
    expect(eulo("ABC")).toBe("으로");
  });

  it("빈 문자열은 안전 폴백으로 으로를 반환한다", () => {
    expect(eulo("")).toBe("으로");
  });
});
