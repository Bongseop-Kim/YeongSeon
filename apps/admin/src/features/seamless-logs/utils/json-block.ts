export function hasJsonBlockContent(value: unknown): boolean {
  if (value == null) return false;
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return false;
  }
  return true;
}
