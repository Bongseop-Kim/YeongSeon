import type { OrderOptions } from "@/features/custom-order/types/order";

export function getFabricLabel(
  opts: Pick<
    OrderOptions,
    "fabricProvided" | "reorder" | "fabricType" | "designType"
  >,
  fallback = "미선택",
): string {
  if (opts.fabricProvided) return "원단 직접 제공";
  if (opts.reorder) return "재주문";
  if (opts.fabricType && opts.designType) {
    return `${opts.fabricType === "SILK" ? "실크" : "폴리"} · ${opts.designType === "YARN_DYED" ? "선염" : "날염"}`;
  }
  return fallback;
}

export function getTieTypeLabel(
  tieType: OrderOptions["tieType"],
  compact = false,
): string {
  if (tieType === "AUTO") return compact ? "자동 타이" : "자동 타이 (지퍼)";
  return compact ? "수동 타이" : "수동 타이 (손매듭)";
}

export function getSewingStyleLabel(
  opts: Pick<OrderOptions, "dimple" | "spoderato" | "fold7">,
): string {
  const styles = [
    opts.dimple && "딤플",
    opts.spoderato && "스포데라토",
    opts.fold7 && "7폴드",
  ].filter(Boolean);
  return styles.length > 0 ? styles.join(", ") : "일반";
}

export function getSizeLabel(sizeType: OrderOptions["sizeType"]): string {
  if (sizeType === "CHILD") return "아동용";
  if (sizeType) return "성인용";
  return "미선택";
}

export function getInterliningLabel(
  opts: Pick<OrderOptions, "interlining" | "interliningThickness">,
): string {
  const parts = [
    opts.interlining === "WOOL" ? "울 심지" : null,
    opts.interlining === "WOOL" && opts.interliningThickness === "THIN"
      ? "얇음"
      : opts.interlining === "WOOL" && opts.interliningThickness
        ? "두꺼움"
        : null,
  ].filter(Boolean);
  return parts.join(", ") || "미선택";
}

export function getLabelOptionsLabel(
  opts: Pick<OrderOptions, "brandLabel" | "careLabel">,
): string {
  const parts = [
    opts.brandLabel ? "브랜드 라벨" : null,
    opts.careLabel ? "케어 라벨" : null,
  ].filter(Boolean);
  return parts.join(", ") || "라벨 없음";
}

export function getFinishingLabel(
  opts: Pick<
    OrderOptions,
    "interlining" | "interliningThickness" | "brandLabel" | "careLabel"
  >,
): string {
  return `${getInterliningLabel(opts)} · ${getLabelOptionsLabel(opts)}`;
}

export function getSampleTypeLabel(opts: {
  sample: boolean;
  sampleType: "sewing" | "fabric" | "fabric_and_sewing" | null;
}): string | null {
  if (!opts.sample || !opts.sampleType) return null;
  if (opts.sampleType === "sewing") return "봉제 샘플";
  if (opts.sampleType === "fabric") return "원단 샘플";
  return "원단 + 봉제 샘플";
}
