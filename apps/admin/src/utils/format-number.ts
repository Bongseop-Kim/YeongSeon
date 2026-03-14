export const formatWithComma = (v: number | string | undefined): string =>
  v != null ? Number(v).toLocaleString("ko-KR") : "";
