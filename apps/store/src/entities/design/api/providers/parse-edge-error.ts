const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseEdgeErrorResponse = async (
  error: unknown,
): Promise<Record<string, unknown> | null> => {
  const response = (error as { context?: unknown } | null)?.context;
  if (!(response instanceof Response)) {
    return null;
  }

  const body = await response.clone().json();
  return isPlainObject(body) ? body : null;
};
