// 미설정(빈 문자열)이면 모든 Origin 허용 모드로 동작
const ALLOWED_ORIGINS: readonly string[] = (() => {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
})();

const isOriginAllowed = (origin: string | null): origin is string => {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
};

export const getCorsHeaders = (
  requestOrigin: string | null,
): Record<string, string> => {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };

  if (ALLOWED_ORIGINS.length === 0) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  if (isOriginAllowed(requestOrigin)) {
    return { ...base, "Access-Control-Allow-Origin": requestOrigin };
  }

  // Origin not in allowlist: omit ACAO to block cross-origin access
  return base;
};
