/** JSON 직렬화 후 바이트 크기 상한 (기본 10KB) */
export const MAX_JSON_PAYLOAD_BYTES = 10_000;

const encoder = new TextEncoder();

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
