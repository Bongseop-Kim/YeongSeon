import type { AdminSettingRowDTO } from "@yeongseon/shared";
import { describe, expect, it } from "vitest";
import { toDefaultCourierSetting } from "@/features/settings/api/settings-mapper";

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
