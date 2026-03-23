import type { AdminSettingRowDTO } from "@yeongseon/shared";

import type {
  DefaultCourierSetting,
  DesignTokenInitialGrantSetting,
} from "@/features/settings/types/admin-settings";

export function toDefaultCourierSetting(
  dto: AdminSettingRowDTO | undefined,
): DefaultCourierSetting {
  return { courierCompany: dto?.value ?? "" };
}

export function toDesignTokenInitialGrantSetting(
  dto: AdminSettingRowDTO | undefined,
): DesignTokenInitialGrantSetting {
  const parsed = Number(dto?.value);
  return { amount: Number.isInteger(parsed) && parsed >= 1 ? parsed : 30 };
}
