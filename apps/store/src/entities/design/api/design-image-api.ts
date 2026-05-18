import { supabase } from "@/shared/lib/supabase";
import type { DesignImage } from "@/entities/design/model/design-image";
import {
  toDesignImage,
  type DesignImageRow,
} from "@/entities/design/api/design-image-mapper";

interface GetDesignImagesResult {
  images: DesignImage[];
  total: number;
}

export async function getDesignImages(
  page: number,
  pageSize = 12,
): Promise<GetDesignImagesResult> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("design_generation_variants")
    .select(
      "id, repeat_tile_url, repeat_tile_work_id, created_at, design_generations!inner(prompt)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`디자인 이미지 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as DesignImageRow[];
  return {
    images: rows.map(toDesignImage),
    total: count ?? 0,
  };
}
