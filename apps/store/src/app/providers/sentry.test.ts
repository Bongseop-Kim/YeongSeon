import { describe, expect, it } from "vitest";
import {
  buildSentryOptions,
  buildTracePropagationTargets,
} from "@/app/providers/sentry";

describe("buildTracePropagationTargets", () => {
  it("includes relative paths, localhost, and the Supabase origin", () => {
    expect(buildTracePropagationTargets("https://example.supabase.co")).toEqual(
      ["localhost", /^\//, "https://example.supabase.co"],
    );
  });
});

describe("buildSentryOptions", () => {
  it("returns null when the DSN is missing", () => {
    expect(
      buildSentryOptions({
        dsn: undefined,
        supabaseUrl: "https://example.supabase.co",
        isProd: true,
      }),
    ).toBeNull();
  });

  it("uses production-friendly sampling defaults", () => {
    const options = buildSentryOptions({
      dsn: "https://examplePublicKey@o0.ingest.us.sentry.io/0",
      supabaseUrl: "https://example.supabase.co",
      environment: undefined,
      release: "store@1.2.3",
      isProd: true,
    });

    expect(options).toMatchObject({
      dsn: "https://examplePublicKey@o0.ingest.us.sentry.io/0",
      environment: "production",
      release: "store@1.2.3",
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1,
      tracePropagationTargets: [
        "localhost",
        /^\//,
        "https://example.supabase.co",
      ],
    });
  });
});
