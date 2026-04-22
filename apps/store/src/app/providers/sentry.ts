import * as Sentry from "@sentry/react";

const PROD_TRACES_SAMPLE_RATE = 0.2;
const PROD_REPLAYS_SESSION_SAMPLE_RATE = 0.05;
const DEV_SAMPLE_RATE = 1;
const REPLAYS_ON_ERROR_SAMPLE_RATE = 1;

type TracePropagationTarget = string | RegExp;

export type StoreSentryConfig = {
  dsn?: string;
  supabaseUrl?: string;
  environment?: string;
  release?: string;
  isProd: boolean;
};

export function buildTracePropagationTargets(
  supabaseUrl?: string,
): TracePropagationTarget[] {
  const targets: TracePropagationTarget[] = ["localhost", /^\//];

  if (!supabaseUrl) {
    return targets;
  }

  try {
    targets.push(new URL(supabaseUrl).origin);
  } catch {
    // Invalid URL — skip rather than emit a non-matching target string.
  }

  return targets;
}

export function buildSentryOptions(config: StoreSentryConfig) {
  if (!config.dsn) {
    return null;
  }

  const environment =
    config.environment ?? (config.isProd ? "production" : "development");

  return {
    dsn: config.dsn,
    environment,
    release: config.release,
    tracesSampleRate: config.isProd ? PROD_TRACES_SAMPLE_RATE : DEV_SAMPLE_RATE,
    tracePropagationTargets: buildTracePropagationTargets(config.supabaseUrl),
    replaysSessionSampleRate: config.isProd
      ? PROD_REPLAYS_SESSION_SAMPLE_RATE
      : DEV_SAMPLE_RATE,
    replaysOnErrorSampleRate: REPLAYS_ON_ERROR_SAMPLE_RATE,
  };
}

export function initSentry(config: StoreSentryConfig): void {
  const options = buildSentryOptions(config);

  if (!options) {
    return;
  }

  Sentry.init({
    ...options,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });
}
