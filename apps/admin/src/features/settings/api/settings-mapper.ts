import type { AdminSettingRowDTO } from "@yeongseon/shared";

import type {
  DefaultCourierSetting,
  DesignTokenInitialGrantSetting,
} from "@/features/settings/types/admin-settings";

export const DEFAULT_DESIGN_TOKEN_INITIAL_GRANT = 30;

export function toDefaultCourierSetting(
  dto: AdminSettingRowDTO | undefined,
): DefaultCourierSetting {
  return { courierCompany: dto?.value ?? "" };
}

export function toDesignTokenInitialGrantSetting(
  dto: AdminSettingRowDTO | undefined,
): DesignTokenInitialGrantSetting {
  const parsed = Number(dto?.value);
  return {
    amount:
      Number.isInteger(parsed) && parsed >= 1
        ? parsed
        : DEFAULT_DESIGN_TOKEN_INITIAL_GRANT,
  };
}
