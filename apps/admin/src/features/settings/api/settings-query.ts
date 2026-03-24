import { useOne, useUpdate, type HttpError } from "@refinedev/core";
import { message } from "antd";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AdminSettingRowDTO } from "@yeongseon/shared";

import {
  DEFAULT_DESIGN_TOKEN_INITIAL_GRANT,
  toDefaultCourierSetting,
  toDesignTokenInitialGrantSetting,
} from "@/features/settings/api/settings-mapper";

const DEFAULT_COURIER_COMPANY_KEY = "default_courier_company";
const DESIGN_TOKEN_INITIAL_GRANT_KEY = "design_token_initial_grant";
const SETTING_RESOURCE = "admin_settings";
const SETTING_ID_META = { idColumnName: "key" } as const;
const SETTING_SAVE_SUCCESS_MESSAGE = "설정이 저장되었습니다.";

function sanitizeDesignTokenInitialGrant(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DESIGN_TOKEN_INITIAL_GRANT;
  }

  return Math.max(1, Math.round(value));
}

interface AdminSettingFormOptions<TValue> {
  key: string;
  initialValue: TValue;
  fromDTO: (dto: AdminSettingRowDTO | undefined) => TValue;
  toDTOValue: (value: TValue) => string;
}

interface AdminSettingFormResult<TValue> {
  value: TValue;
  setValue: Dispatch<SetStateAction<TValue>>;
  save: () => void;
  isLoading: boolean;
  isError: boolean;
  error: HttpError | null;
  refetch: () => Promise<unknown>;
  isSaving: boolean;
}

function useAdminSettingForm<TValue>({
  key,
  initialValue,
  fromDTO,
  toDTOValue,
}: AdminSettingFormOptions<TValue>): AdminSettingFormResult<TValue> {
  const { query, result } = useOne<AdminSettingRowDTO>({
    resource: SETTING_RESOURCE,
    id: key,
    meta: SETTING_ID_META,
  });

  const { mutate: updateSetting, mutation } = useUpdate();

  const [value, setValue] = useState<TValue>(initialValue);

  useEffect(() => {
    if (result !== undefined) {
      setValue(fromDTO(result));
    }
  }, [fromDTO, result]);

  const save = () => {
    updateSetting(
      {
        resource: SETTING_RESOURCE,
        id: key,
        values: { value: toDTOValue(value) },
        meta: SETTING_ID_META,
      },
      {
        onSuccess: () => {
          message.success(SETTING_SAVE_SUCCESS_MESSAGE);
        },
        onError: (error) => {
          message.error(`설정 저장에 실패했습니다: ${error.message}`);
        },
      },
    );
  };

  return {
    value,
    setValue,
    save,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isSaving: mutation.isPending,
  };
}

export function useDefaultCourier(): string | undefined {
  const { result } = useOne<AdminSettingRowDTO>({
    resource: SETTING_RESOURCE,
    id: DEFAULT_COURIER_COMPANY_KEY,
    meta: SETTING_ID_META,
  });

  return result?.value ?? undefined;
}

export function useDefaultCourierForm() {
  const fromDTO = useCallback(
    (dto: AdminSettingRowDTO | undefined) =>
      toDefaultCourierSetting(dto).courierCompany,
    [],
  );

  const form = useAdminSettingForm({
    key: DEFAULT_COURIER_COMPANY_KEY,
    initialValue: "",
    fromDTO,
    toDTOValue: (courierCompany) => courierCompany,
  });

  return {
    courierCompany: form.value,
    setCourierCompany: form.setValue,
    save: form.save,
    isLoading: form.isLoading,
    isError: form.isError,
    error: form.error,
    refetch: form.refetch,
    isSaving: form.isSaving,
  };
}

export function useDesignTokenInitialGrantForm() {
  const fromDTO = useCallback(
    (dto: AdminSettingRowDTO | undefined) =>
      toDesignTokenInitialGrantSetting(dto).amount,
    [],
  );

  const form = useAdminSettingForm({
    key: DESIGN_TOKEN_INITIAL_GRANT_KEY,
    initialValue: DEFAULT_DESIGN_TOKEN_INITIAL_GRANT,
    fromDTO,
    toDTOValue: (amount) =>
      String(sanitizeDesignTokenInitialGrant(Number(amount))),
  });

  return {
    amount: form.value,
    setAmount: (value: SetStateAction<number>) => {
      form.setValue((currentValue) => {
        const nextValue =
          typeof value === "function" ? value(currentValue) : value;
        return sanitizeDesignTokenInitialGrant(nextValue);
      });
    },
    save: form.save,
    isLoading: form.isLoading,
    isError: form.isError,
    error: form.error,
    refetch: form.refetch,
    isSaving: form.isSaving,
  };
}
