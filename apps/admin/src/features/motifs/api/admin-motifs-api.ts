import { supabase } from "@/lib/supabase";
import { toAdminMotifItem } from "@/features/motifs/api/admin-motifs-mapper";
import { ADMIN_MOTIF_PAGE_SIZE } from "@/features/motifs/constants";
import type {
  AdminMotifItem,
  MotifSourceFilter,
} from "@/features/motifs/types/admin-motif";

export async function getAdminMotifs(params: {
  source?: MotifSourceFilter | null;
  idSearch?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminMotifItem[]> {
  const { data, error } = await supabase.rpc("admin_get_motifs", {
    p_source: params.source ?? null,
    p_id_search: params.idSearch ?? null,
    p_limit: params.limit ?? ADMIN_MOTIF_PAGE_SIZE,
    p_offset: params.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return data.map(toAdminMotifItem);
}
