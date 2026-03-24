import type { AdminSettingRowDTO } from "@yeongseon/shared";
import { describe, expect, it } from "vitest";
import {
  toDefaultCourierSetting,
  toDesignTokenInitialGrantSetting,
  DEFAULT_DESIGN_TOKEN_INITIAL_GRANT,
} from "@/features/settings/api/settings-mapper";

describe("toDefaultCourierSetting", () => {
  it("dto에서 courierCompany를 추출한다", () => {
    const dto: AdminSettingRowDTO = {
      key: "default_courier",
      value: "CJ대한통운",
      updated_at: "2026-03-15T09:00:00Z",
      updated_by: "admin-1",
    };

    expect(toDefaultCourierSetting(dto)).toEqual({
      courierCompany: "CJ대한통운",
    });
  });

  it("dto가 undefined이면 빈 문자열을 반환한다", () => {
    expect(toDefaultCourierSetting(undefined)).toEqual({
      courierCompany: "",
    });
  });

  it("value가 null이면 빈 문자열을 반환한다", () => {
    expect(
      toDefaultCourierSetting({
        key: "default_courier",
        value: null,
        updated_at: "2026-03-15T09:00:00Z",
        updated_by: null,
      }),
    ).toEqual({
      courierCompany: "",
    });
  });
});

describe("toDesignTokenInitialGrantSetting", () => {
  it("유효한 정수 값을 그대로 반환한다", () => {
    const dto: AdminSettingRowDTO = {
      key: "design_token_initial_grant",
      value: "50",
      updated_at: "2026-03-15T09:00:00Z",
      updated_by: "admin-1",
    };
    expect(toDesignTokenInitialGrantSetting(dto)).toEqual({ amount: 50 });
  });

  it("dto가 undefined이면 기본값을 반환한다", () => {
    expect(toDesignTokenInitialGrantSetting(undefined)).toEqual({
      amount: DEFAULT_DESIGN_TOKEN_INITIAL_GRANT,
    });
  });

  it("value가 0이면 기본값을 반환한다", () => {
    expect(
      toDesignTokenInitialGrantSetting({
        key: "design_token_initial_grant",
        value: "0",
        updated_at: "2026-03-15T09:00:00Z",
        updated_by: null,
      }),
    ).toEqual({ amount: DEFAULT_DESIGN_TOKEN_INITIAL_GRANT });
  });

  it("value가 음수이면 기본값을 반환한다", () => {
    expect(
      toDesignTokenInitialGrantSetting({
        key: "design_token_initial_grant",
        value: "-5",
        updated_at: "2026-03-15T09:00:00Z",
        updated_by: null,
      }),
    ).toEqual({ amount: DEFAULT_DESIGN_TOKEN_INITIAL_GRANT });
  });

  it("value가 소수이면 기본값을 반환한다", () => {
    expect(
      toDesignTokenInitialGrantSetting({
        key: "design_token_initial_grant",
        value: "1.5",
        updated_at: "2026-03-15T09:00:00Z",
        updated_by: null,
      }),
    ).toEqual({ amount: DEFAULT_DESIGN_TOKEN_INITIAL_GRANT });
  });

  it("value가 문자열이면 기본값을 반환한다", () => {
    expect(
      toDesignTokenInitialGrantSetting({
        key: "design_token_initial_grant",
        value: "abc",
        updated_at: "2026-03-15T09:00:00Z",
        updated_by: null,
      }),
    ).toEqual({ amount: DEFAULT_DESIGN_TOKEN_INITIAL_GRANT });
  });
});
