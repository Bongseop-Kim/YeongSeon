import { useQuery } from "@tanstack/react-query";
import { getAdminSetting } from "@/features/settings/api/settings-api";

const DEFAULT_COURIER_COMPANY_KEY = "default_courier_company";

export function useDefaultCourier(): string | undefined {
  const { data } = useQuery({
    queryKey: ["admin-settings", DEFAULT_COURIER_COMPANY_KEY],
    queryFn: () => getAdminSetting(DEFAULT_COURIER_COMPANY_KEY),
  });

  return data?.value ?? undefined;
}
