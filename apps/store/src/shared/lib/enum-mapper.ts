import { createGuard } from "@/shared/lib/type-guard";

export const createEnumMapper = <T extends string>(set: ReadonlySet<T>) => {
  const guard = createGuard<T>(set);
  return (value: unknown): T | null =>
    typeof value === "string" && guard(value) ? value : null;
};
