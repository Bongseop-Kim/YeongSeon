import { describe, expect, it } from "vitest";
import {
  applyMarketingConsentToggle,
  normalizeMarketingConsent,
} from "@/features/my-page/api/profile-mapper";

describe("normalizeMarketingConsent", () => {
  it("비객체 입력이면 기본값을 반환한다", () => {
    expect(normalizeMarketingConsent(null)).toEqual({
      all: false,
      channels: {
        sms: false,
        email: false,
      },
    });
  });

  it("채널 중 하나라도 true면 all을 true로 정규화한다", () => {
    expect(
      normalizeMarketingConsent({
        channels: {
          sms: true,
          email: false,
        },
      }),
    ).toEqual({
      all: true,
      channels: {
        sms: true,
        email: false,
      },
    });
  });

  it("all이 false면 모든 채널을 false로 강제한다", () => {
    expect(
      normalizeMarketingConsent({
        all: false,
        channels: {
          sms: true,
          email: true,
        },
      }),
    ).toEqual({
      all: false,
      channels: {
        sms: false,
        email: false,
      },
    });
  });
});

describe("applyMarketingConsentToggle", () => {
  it("all 토글은 모든 채널에 반영된다", () => {
    expect(
      applyMarketingConsentToggle(
        {
          all: false,
          channels: { sms: false, email: false },
        },
        { target: "all", checked: true },
      ),
    ).toEqual({
      all: true,
      channels: {
        sms: true,
        email: true,
      },
    });
  });

  it("개별 채널 토글은 all 상태를 재계산한다", () => {
    const current = {
      all: true,
      channels: {
        sms: true,
        email: true,
      },
    };

    expect(
      applyMarketingConsentToggle(current, { target: "sms", checked: false }),
    ).toEqual({
      all: true,
      channels: {
        sms: false,
        email: true,
      },
    });

    expect(
      applyMarketingConsentToggle(
        {
          all: true,
          channels: { sms: false, email: true },
        },
        { target: "email", checked: false },
      ),
    ).toEqual({
      all: false,
      channels: {
        sms: false,
        email: false,
      },
    });
  });
});
