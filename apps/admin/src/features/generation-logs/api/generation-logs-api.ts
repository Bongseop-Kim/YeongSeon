import { supabase } from "@/lib/supabase";
import {
  toAdminGenerationLogItem,
  toGenerationStatsData,
} from "@/features/generation-logs/api/generation-logs-mapper";
import type {
  AdminGenerationLogItem,
  GenerationStatsData,
} from "@/features/generation-logs/types/admin-generation-log";

export async function getGenerationStats(
  startDate: string,
  endDate: string,
): Promise<GenerationStatsData> {
  const { data, error } = await supabase.rpc("admin_get_generation_stats", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return toGenerationStatsData(data);
}

export async function getGenerationLogs(params: {
  startDate: string;
  endDate: string;
  aiModel?: string | null;
  limit?: number;
  offset?: number;
  id?: string | null;
  requestType?: string | null;
  status?: string | null;
  idSearch?: string | null;
}): Promise<AdminGenerationLogItem[]> {
  const { data, error } = await supabase.rpc("admin_get_generation_logs", {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_ai_model: params.aiModel ?? null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
    p_id: params.id ?? null,
    p_request_type: params.requestType ?? null,
    p_status: params.status ?? null,
    p_id_search: params.idSearch ?? null,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return data.map(toAdminGenerationLogItem);
}
