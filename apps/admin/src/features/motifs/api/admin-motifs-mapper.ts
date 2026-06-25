import type {
  AdminMotifItem,
  MotifAnchor,
  MotifBBox,
} from "@/features/motifs/types/admin-motif";
import { isRecord } from "@/utils/type-guards";

function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === "string");
}

function toBBox(v: unknown): MotifBBox {
  const values = Array.isArray(v) ? v.map(toNumber) : [];
  if (values.length === 4 && values.every((item) => item != null)) {
    return values as MotifBBox;
  }
  return [0, 0, 1, 1];
}

function toAnchor(v: unknown): MotifAnchor {
  const values = Array.isArray(v) ? v.map(toNumber) : [];
  if (values.length === 2 && values.every((item) => item != null)) {
    return values as MotifAnchor;
  }
  return [0.5, 0.5];
}

export function toAdminMotifItem(row: unknown): AdminMotifItem {
  const r = isRecord(row) ? row : {};
  return {
    id: toString(r.id) ?? "",
    symbol: toString(r.symbol) ?? "",
    colorSlots: toStringArray(r.color_slots),
    bbox: toBBox(r.bbox),
    anchor: toAnchor(r.anchor),
    subject: toString(r.subject),
    scope: toString(r.scope),
    view: toString(r.view),
    expression: toString(r.expression),
    style: toString(r.style),
    description: toString(r.description),
    tags: toStringArray(r.tags),
    source: toString(r.source) ?? "",
    quality: toNumber(r.quality),
    variantGroup: toString(r.variant_group),
    createdAt: toString(r.created_at) ?? "",
  };
}
