export type MotifSourceFilter = "llm" | "recraft" | "builtin";
export type MotifBBox = [number, number, number, number];
export type MotifAnchor = [number, number];

export interface AdminMotifItem {
  id: string;
  symbol: string;
  colorSlots: string[];
  bbox: MotifBBox;
  anchor: MotifAnchor;
  subject: string | null;
  scope: string | null;
  view: string | null;
  expression: string | null;
  style: string | null;
  description: string | null;
  tags: string[];
  source: MotifSourceFilter | string;
  quality: number | null;
  variantGroup: string | null;
  createdAt: string;
}
