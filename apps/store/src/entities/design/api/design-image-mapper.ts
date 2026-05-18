import type { DesignImage } from "@/entities/design/model/design-image";

export interface DesignImageRow {
  id: string;
  repeat_tile_url: string;
  repeat_tile_work_id?: string | null;
  created_at: string;
  design_generations: { prompt: string } | null;
}

export function toDesignImage(row: DesignImageRow): DesignImage {
  return {
    imageUrl: row.repeat_tile_url,
    imageFileId: row.repeat_tile_work_id ?? null,
    createdAt: row.created_at,
    sessionFirstMessage: row.design_generations?.prompt ?? "",
  };
}
