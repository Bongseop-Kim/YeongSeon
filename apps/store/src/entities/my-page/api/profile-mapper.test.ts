import { describe, expect, it } from "vitest";
import { toUserProfile } from "./profile-mapper";

describe("toUserProfile", () => {
  const baseProfileRow = {
    id: "user-1",
    name: "홍길동",
    phone: "010-1234-5678",
    birth: "1990-01-01",
    phone_verified: true,
    notification_consent: true,
    notification_enabled: true,
    marketing_kakao_sms_consent: false,
  };

  const baseUser = { email: "test@example.com", user_metadata: {} };

  it("marketing_kakao_sms_consent가 true면 kakaoSms가 true다", () => {
    const result = toUserProfile(
      { ...baseProfileRow, marketing_kakao_sms_consent: true },
      baseUser,
    );
    expect(result.marketingConsent.kakaoSms).toBe(true);
  });

  it("marketing_kakao_sms_consent가 false면 kakaoSms가 false다", () => {
    const result = toUserProfile(
      { ...baseProfileRow, marketing_kakao_sms_consent: false },
      baseUser,
    );
    expect(result.marketingConsent.kakaoSms).toBe(false);
  });

  it("null이면 kakaoSms가 false 기본값이다", () => {
    const result = toUserProfile(
      { ...baseProfileRow, marketing_kakao_sms_consent: null },
      baseUser,
    );
    expect(result.marketingConsent.kakaoSms).toBe(false);
  });

  it("이메일을 user에서 가져온다", () => {
    const result = toUserProfile(baseProfileRow, {
      email: "other@example.com",
      user_metadata: {},
    });
    expect(result.email).toBe("other@example.com");
  });
});
