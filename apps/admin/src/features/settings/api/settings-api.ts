import type { AdminSettingRowDTO } from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";

export async function getAdminSetting(
  key: string,
): Promise<AdminSettingRowDTO | undefined> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("key,value,updated_at,updated_by")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? undefined;
}

export async function updateAdminSetting(params: {
  key: string;
  value: string;
}): Promise<AdminSettingRowDTO> {
  const { data, error } = await supabase
    .from("admin_settings")
    .update({ value: params.value })
    .eq("key", params.key)
    .select("key,value,updated_at,updated_by")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
