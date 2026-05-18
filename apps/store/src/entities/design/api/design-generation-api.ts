import {
  toDesignGeneration,
  type DesignGenerationRow,
} from "@/entities/design/api/design-generation-mapper";
import type { DesignGeneration } from "@/entities/design/model/design-generation";
import { supabase } from "@/shared/lib/supabase";

const DESIGN_GENERATION_SELECT_FIELDS =
  "id, user_id, prompt, pattern_type, fabric_type, created_at, updated_at, design_generation_variants(id, generation_id, variant_index, repeat_tile_url, repeat_tile_work_id, accent_tile_url, accent_tile_work_id, accent_layout_json, pattern_type, fabric_type, created_at)";

export async function getDesignGenerations(params: {
  limit: number;
  offset: number;
}): Promise<DesignGeneration[]> {
  const { data, error } = await supabase
    .from("design_generations")
    .select(DESIGN_GENERATION_SELECT_FIELDS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    throw new Error(`디자인 생성 목록 조회 실패: ${error.message}`);
  }

  return ((data ?? []) as DesignGenerationRow[]).map(toDesignGeneration);
}

export async function deleteDesignGeneration(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_design_generation", {
    p_generation_id: id,
  });

  if (error) {
    throw new Error(`디자인 생성 삭제 실패: ${error.message}`);
  }
}
