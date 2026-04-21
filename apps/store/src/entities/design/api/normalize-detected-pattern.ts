export const normalizeDetectedPattern = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue.length > 0 ? normalizedValue : null;
};
