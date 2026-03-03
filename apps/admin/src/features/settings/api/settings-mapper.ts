import type { AdminSettingRowDTO } from "@yeongseon/shared";

import type { DefaultCourierSetting } from "@/features/settings/types/admin-settings";

export function toDefaultCourierSetting(
  dto: AdminSettingRowDTO | undefined,
): DefaultCourierSetting {
  return { courierCompany: dto?.value ?? "" };
}
