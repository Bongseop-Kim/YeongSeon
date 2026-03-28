/** JSON 직렬화 후 바이트 크기 상한 (기본 10KB) */
export const MAX_JSON_PAYLOAD_BYTES = 10_000;

const encoder = new TextEncoder();
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isJsonPayloadWithinLimit = (
  value: unknown,
  maxBytes = MAX_JSON_PAYLOAD_BYTES,
): boolean => {
  try {
    return encoder.encode(JSON.stringify(value)).byteLength <= maxBytes;
  } catch {
    return false;
  }
};

export const normalizeOptionalUuid = (
  value: unknown,
): { value: string | null; isValid: boolean } => {
  if (value === null || value === undefined) {
    return { value: null, isValid: true };
  }

  if (typeof value !== "string") {
    return { value: null, isValid: false };
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return { value: null, isValid: true };
  }

  if (!UUID_PATTERN.test(trimmedValue)) {
    return { value: null, isValid: false };
  }

  return { value: trimmedValue, isValid: true };
};
