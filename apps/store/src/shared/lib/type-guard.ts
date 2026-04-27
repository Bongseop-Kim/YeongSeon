export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const createGuard =
  <T extends string>(set: ReadonlySet<T>) =>
  (value: string): value is T =>
    set.has(value as T);

export const hasStringCode = (e: unknown): e is { code: string } =>
  typeof e === "object" &&
  e !== null &&
  "code" in e &&
  typeof (e as { code?: unknown }).code === "string";
