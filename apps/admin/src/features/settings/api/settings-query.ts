import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AdminSettingRowDTO } from "@yeongseon/shared";

import { getAdminSetting } from "@/entities/settings";
import { updateAdminSetting } from "@/features/settings/api/settings-api";
import {
  DEFAULT_DESIGN_TOKEN_INITIAL_GRANT,
  sanitizeDesignTokenInitialGrantAmount,
  toDefaultCourierSetting,
  toDesignTokenInitialGrantDTOValue,
  toDesignTokenInitialGrantSetting,
} from "@/features/settings/api/settings-mapper";

const DEFAULT_COURIER_COMPANY_KEY = "default_courier_company";
const DESIGN_TOKEN_INITIAL_GRANT_KEY = "design_token_initial_grant";

interface AdminSettingFormOptions<TValue> {
  key: string;
  initialValue: TValue;
  fromDTO: (dto: AdminSettingRowDTO | undefined) => TValue;
  toDTOValue: (value: TValue) => string;
}

interface AdminSettingFormResult<TValue> {
  value: TValue;
  savedValue: TValue;
  setValue: Dispatch<SetStateAction<TValue>>;
  save: () => Promise<AdminSettingRowDTO>;
  reset: () => void;
  isDirty: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  isSaving: boolean;
  saveError: Error | null;
}

function useAdminSettingForm<TValue>({
  key,
  initialValue,
  fromDTO,
  toDTOValue,
}: AdminSettingFormOptions<TValue>): AdminSettingFormResult<TValue> {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-settings", key],
    queryFn: () => getAdminSetting(key),
  });

  const mutation = useMutation({
    mutationFn: (value: TValue) =>
      updateAdminSetting({ key, value: toDTOValue(value) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-settings", key] });
    },
  });

  const [value, setValue] = useState<TValue>(initialValue);
  const [savedValue, setSavedValue] = useState<TValue>(initialValue);
  const hasUserEditedRef = useRef(false);

  const setDirtyValue = useCallback<Dispatch<SetStateAction<TValue>>>(
    (nextValue) => {
      hasUserEditedRef.current = true;
      setValue(nextValue);
    },
    [],
  );

  useEffect(() => {
    if (query.data !== undefined) {
      const nextSavedValue = fromDTO(query.data);
      setSavedValue(nextSavedValue);
      if (!hasUserEditedRef.current) {
        setValue(nextSavedValue);
      }
    }
  }, [fromDTO, query.data]);

  const save = async () => {
    const result = await mutation.mutateAsync(value);
    const nextSavedValue = fromDTO(result);
    setSavedValue(nextSavedValue);
    setValue(nextSavedValue);
    hasUserEditedRef.current = false;
    return result;
  };

  const reset = () => {
    setValue(savedValue);
    hasUserEditedRef.current = false;
  };

  return {
    value,
    savedValue,
    setValue: setDirtyValue,
    save,
    reset,
    isDirty: !Object.is(value, savedValue),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  };
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
    savedCourierCompany: form.savedValue,
    setCourierCompany: form.setValue,
    save: form.save,
    reset: form.reset,
    isDirty: form.isDirty,
    isLoading: form.isLoading,
    isError: form.isError,
    error: form.error,
    refetch: form.refetch,
    isSaving: form.isSaving,
    saveError: form.saveError,
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
    toDTOValue: toDesignTokenInitialGrantDTOValue,
  });

  return {
    amount: form.value,
    savedAmount: form.savedValue,
    setAmount: (value: SetStateAction<number>) => {
      form.setValue((currentValue) => {
        const nextValue =
          typeof value === "function" ? value(currentValue) : value;
        return sanitizeDesignTokenInitialGrantAmount(nextValue);
      });
    },
    save: form.save,
    reset: form.reset,
    isDirty: form.isDirty,
    isLoading: form.isLoading,
    isError: form.isError,
    error: form.error,
    refetch: form.refetch,
    isSaving: form.isSaving,
    saveError: form.saveError,
  };
}
