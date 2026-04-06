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
    // ALLOWED_ORIGINS 미설정 시 모든 Origin 차단 (fail-closed)
    return base;
  }

  if (isOriginAllowed(requestOrigin)) {
    return { ...base, "Access-Control-Allow-Origin": requestOrigin };
  }

  // Origin not in allowlist: omit ACAO to block cross-origin access
  return base;
};
