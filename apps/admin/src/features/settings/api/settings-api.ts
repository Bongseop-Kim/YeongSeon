import type { AdminSettingRowDTO } from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";

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
