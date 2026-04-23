import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";

Deno.test(
  "getCorsHeaders allows sentry tracing headers used by the store app",
  async () => {
    const previousAllowedOrigins = Deno.env.get("ALLOWED_ORIGINS");
    Deno.env.set("ALLOWED_ORIGINS", "https://essesion.shop");

    try {
      const { getCorsHeaders } =
        await import("@/functions/_shared/cors.ts?test=sentry-headers");
      const headers = getCorsHeaders("https://essesion.shop");

      assertEquals(
        headers["Access-Control-Allow-Origin"],
        "https://essesion.shop",
      );
      assertStringIncludes(headers["Access-Control-Allow-Headers"], "baggage");
      assertStringIncludes(
        headers["Access-Control-Allow-Headers"],
        "sentry-trace",
      );
    } finally {
      if (previousAllowedOrigins === undefined) {
        Deno.env.delete("ALLOWED_ORIGINS");
      } else {
        Deno.env.set("ALLOWED_ORIGINS", previousAllowedOrigins);
      }
    }
  },
);
