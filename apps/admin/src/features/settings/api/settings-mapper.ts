import type { AdminSettingRowDTO } from "@yeongseon/shared";

import type {
  DefaultCourierSetting,
  DesignTokenInitialGrantSetting,
} from "@/features/settings/types/admin-settings";

export const DEFAULT_DESIGN_TOKEN_INITIAL_GRANT = 30;

export function sanitizeDesignTokenInitialGrantAmount(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return DEFAULT_DESIGN_TOKEN_INITIAL_GRANT;
  }

  return value;
}

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
    amount: sanitizeDesignTokenInitialGrantAmount(parsed),
  };
}

export function toDesignTokenInitialGrantDTOValue(value: number): string {
  return String(sanitizeDesignTokenInitialGrantAmount(value));
}
