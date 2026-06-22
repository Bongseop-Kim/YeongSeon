import { supabase } from "@/lib/supabase";
import {
  toAdminSeamlessLogItem,
  toSeamlessStatsData,
} from "@/features/seamless-logs/api/seamless-logs-mapper";
import type {
  AdminSeamlessLogItem,
  SeamlessInputTypeFilter,
  SeamlessStatsData,
  SeamlessStatusFilter,
} from "@/features/seamless-logs/types/admin-seamless-log";

export async function getSeamlessStats(
  startDate: string,
  endDate: string,
): Promise<SeamlessStatsData> {
  const { data, error } = await supabase.rpc(
    "admin_get_seamless_generation_stats",
    {
      p_start_date: startDate,
      p_end_date: endDate,
    },
  );
  if (error) throw new Error(error.message);
  return toSeamlessStatsData(data);
}

export async function getSeamlessLogs(params: {
  startDate?: string | null;
  endDate?: string | null;
  inputType?: SeamlessInputTypeFilter | null;
  status?: SeamlessStatusFilter | null;
  idSearch?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminSeamlessLogItem[]> {
  const { data, error } = await supabase.rpc(
    "admin_get_seamless_generation_logs",
    {
      p_start_date: params.startDate ?? null,
      p_end_date: params.endDate ?? null,
      p_input_type: params.inputType ?? null,
      p_status: params.status ?? null,
      p_id_search: params.idSearch ?? null,
      p_limit: params.limit ?? 50,
      p_offset: params.offset ?? 0,
    },
  );
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return data.map(toAdminSeamlessLogItem);
}

export async function getSeamlessLog(
  id: string,
): Promise<AdminSeamlessLogItem | null> {
  const { data, error } = await supabase.rpc(
    "admin_get_seamless_generation_log",
    {
      p_id: id,
    },
  );
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data.length === 0) return null;
  return toAdminSeamlessLogItem(data[0]);
}
