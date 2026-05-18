import { describe, expect, it } from "vitest";
import {
  getQuoteContactDefaults,
  getQuoteContactValueForMethod,
} from "./contact-defaults";

describe("getQuoteContactDefaults", () => {
  it("전화번호가 있으면 전화 연락처를 1순위 기본값으로 사용한다", () => {
    expect(
      getQuoteContactDefaults({
        profile: {
          name: "김담당",
          phone: "01012345678",
          email: "user@example.com",
        },
        user: {
          email: "auth@example.com",
          user_metadata: { kakao_id: "kakao-user" },
        },
      }),
    ).toEqual({
      contactName: "김담당",
      contactMethod: "phone",
      contactValue: "01012345678",
    });
  });

  it("전화번호가 없으면 카카오톡 ID가 있어도 이메일을 2순위 기본값으로 사용한다", () => {
    expect(
      getQuoteContactDefaults({
        profile: {
          name: "김담당",
          phone: null,
          email: "user@example.com",
        },
        user: {
          email: "auth@example.com",
          user_metadata: { kakaoId: "kakao-user" },
        },
      }),
    ).toEqual({
      contactName: "김담당",
      contactMethod: "email",
      contactValue: "user@example.com",
    });
  });

  it("프로필 이메일이 없으면 auth 이메일을 사용한다", () => {
    expect(
      getQuoteContactDefaults({
        profile: {
          name: "김담당",
          phone: null,
          email: null,
        },
        user: {
          email: "auth@example.com",
          user_metadata: {},
        },
      }),
    ).toEqual({
      contactName: "김담당",
      contactMethod: "email",
      contactValue: "auth@example.com",
    });
  });
});

describe("getQuoteContactValueForMethod", () => {
  it("연락 방법이 이메일이면 전화번호가 있어도 이메일 주소를 반환한다", () => {
    expect(
      getQuoteContactValueForMethod({
        method: "email",
        profile: {
          name: "김담당",
          phone: "01012345678",
          email: "user@example.com",
        },
        user: { email: "auth@example.com" },
      }),
    ).toBe("user@example.com");
  });

  it("연락 방법이 전화이면 전화번호를 반환한다", () => {
    expect(
      getQuoteContactValueForMethod({
        method: "phone",
        profile: {
          name: "김담당",
          phone: "01012345678",
          email: "user@example.com",
        },
        user: { email: "auth@example.com" },
      }),
    ).toBe("01012345678");
  });
});
