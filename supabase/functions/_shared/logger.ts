export const createLogger = (prefix: string) => ({
  processLogger: (step: string, payload: Record<string, unknown>) => {
    console.log(`[${prefix}:${step}]`, JSON.stringify(payload));
  },
  errorLogger: (
    step: string,
    error: unknown,
    payload: Record<string, unknown> = {},
  ) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[${prefix}:${step}]`,
      JSON.stringify({ ...payload, error: message }),
    );
  },
});
