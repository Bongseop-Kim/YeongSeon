import { useMemo } from "react";
import dayjs from "dayjs";
import { Text } from "seed-design/ui/text";
import { ActionButton } from "seed-design/ui/action-button";
import { StatusBadge } from "@/components/StatusBadge";
import type { AdminMotifItem } from "@/features/motifs/types/admin-motif";
import "./motifs.css";

interface MotifGridProps {
  data: AdminMotifItem[];
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getSymbolId(symbol: string, fallbackId: string): string {
  return symbol.match(/<symbol\b[^>]*\bid=(["'])(.*?)\1/i)?.[2] ?? fallbackId;
}

function ensureSymbolId(symbol: string, symbolId: string): string {
  if (/<symbol\b[^>]*\bid=(["']).*?\1/i.test(symbol)) return symbol;
  return symbol.replace("<symbol", `<symbol id="${escapeAttr(symbolId)}"`);
}

function toPreviewUri(motif: AdminMotifItem): string | null {
  if (!motif.symbol.includes("<symbol")) return null;
  const [minX, minY, maxX, maxY] = motif.bbox;
  const width = Math.max(0.001, maxX - minX);
  const height = Math.max(0.001, maxY - minY);
  const symbolId = getSymbolId(motif.symbol, `motif-${motif.id}`);
  const symbol = ensureSymbolId(motif.symbol, symbolId);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" color="#1f2937">`,
    '<rect width="100%" height="100%" fill="#fff"/>',
    `<defs>${symbol}</defs>`,
    `<use href="#${escapeAttr(symbolId)}" x="${minX}" y="${minY}" width="${width}" height="${height}"/>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function MotifPreview({ motif }: { motif: AdminMotifItem }) {
  const src = useMemo(() => toPreviewUri(motif), [motif]);
  if (!src) {
    return <div className="motifPreviewPlaceholder">SVG 없음</div>;
  }
  return (
    <img
      className="motifPreviewImage"
      src={src}
      alt={`${motif.id} motif preview`}
      loading="lazy"
      decoding="async"
    />
  );
}

function MotifCard({ motif }: { motif: AdminMotifItem }) {
  const meta = [
    motif.subject,
    motif.scope,
    motif.style,
    motif.variantGroup,
  ].filter(Boolean);

  return (
    <article className="motifCard">
      <MotifPreview motif={motif} />
      <div className="motifCardBody">
        <Text as="h2" textStyle="t5Bold" className="motifCardTitle">
          {motif.id}
        </Text>
        <div className="motifChipRow">
          <StatusBadge tone={motif.status === "curated" ? "positive" : "brand"}>
            {motif.status || "-"}
          </StatusBadge>
          <StatusBadge>{motif.source || "-"}</StatusBadge>
          {motif.colorSlots.length > 1 ? (
            <StatusBadge>{motif.colorSlots.length} colors</StatusBadge>
          ) : null}
        </div>
        {meta.length > 0 ? (
          <Text as="p" textStyle="t3Regular" className="motifMetaText">
            {meta.join(" / ")}
          </Text>
        ) : null}
        {motif.description ? (
          <Text as="p" textStyle="t3Regular" className="motifDescription">
            {motif.description}
          </Text>
        ) : null}
        <Text as="p" textStyle="t2Regular" className="motifMetaText">
          {motif.createdAt
            ? dayjs(motif.createdAt).format("YYYY-MM-DD HH:mm")
            : "-"}
        </Text>
      </div>
    </article>
  );
}

export function MotifGrid({
  data,
  page,
  hasMore,
  onPageChange,
}: MotifGridProps) {
  const totalPages = hasMore ? page + 1 : page;

  return (
    <>
      {data.length === 0 ? (
        <div className="motifEmpty">Motif가 없습니다.</div>
      ) : (
        <div className="motifGrid">
          {data.map((motif) => (
            <MotifCard key={motif.id} motif={motif} />
          ))}
        </div>
      )}
      <nav className="motifPagination" aria-label="Motif SVG 페이지네이션">
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          이전
        </ActionButton>
        <Text as="span" textStyle="t4Regular">
          {page} / {totalPages}
        </Text>
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={!hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          다음
        </ActionButton>
      </nav>
    </>
  );
}
