import { useOne, useUpdate } from "@refinedev/core";
import { message } from "antd";
import { useEffect, useRef, useState } from "react";
import type { AdminSettingRowDTO } from "@yeongseon/shared";

import { toDefaultCourierSetting } from "@/features/settings/api/settings-mapper";

const DEFAULT_COURIER_COMPANY_KEY = "default_courier_company";

export function useDefaultCourier(): string | undefined {
  const { result } = useOne<AdminSettingRowDTO>({
    resource: "admin_settings",
    id: DEFAULT_COURIER_COMPANY_KEY,
    meta: { idColumnName: "key" },
  });

  return result?.value ?? undefined;
}

export function useDefaultCourierForm() {
  const { query, result } = useOne<AdminSettingRowDTO>({
    resource: "admin_settings",
    id: DEFAULT_COURIER_COMPANY_KEY,
    meta: { idColumnName: "key" },
  });

  const { mutate: updateSetting, mutation } = useUpdate();

  const [courierCompany, setCourierCompany] = useState<string>("");
  const initialized = useRef(false);

  useEffect(() => {
    if (result !== undefined && !initialized.current) {
      initialized.current = true;
      setCourierCompany(toDefaultCourierSetting(result).courierCompany);
    }
    if (!result) {
      initialized.current = false;
    }
  }, [result]);

  const save = () => {
    updateSetting(
      {
        resource: "admin_settings",
        id: DEFAULT_COURIER_COMPANY_KEY,
        values: { value: courierCompany },
        meta: { idColumnName: "key" },
      },
      {
        onSuccess: () => {
          message.success("설정이 저장되었습니다.");
        },
        onError: (error) => {
          message.error(`설정 저장에 실패했습니다: ${error.message}`);
        },
      },
    );
  };

  return {
    courierCompany,
    setCourierCompany,
    save,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isSaving: mutation.isPending,
  };
}
