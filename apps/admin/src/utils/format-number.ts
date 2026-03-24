export const formatWithComma = (v: number | string | undefined): string =>
  v != null ? Number(v).toLocaleString("ko-KR") : "";

export const formatNullableLocaleNumber = (
  v: number | null | undefined,
): string => (v == null ? "-" : v.toLocaleString("ko-KR"));
