import { useOne } from "@refinedev/core";
import type { AdminSettingRowDTO } from "@yeongseon/shared";

const DEFAULT_COURIER_COMPANY_KEY = "default_courier_company";
const SETTING_RESOURCE = "admin_settings";
const SETTING_ID_META = { idColumnName: "key" } as const;

export function useDefaultCourier(): string | undefined {
  const { result } = useOne<AdminSettingRowDTO>({
    resource: SETTING_RESOURCE,
    id: DEFAULT_COURIER_COMPANY_KEY,
    meta: SETTING_ID_META,
  });

  return result?.value ?? undefined;
}
