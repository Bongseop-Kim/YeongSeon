import {
  ALLOWED_TILED_MIME_TYPES,
  MAX_IMAGE_BASE64_LENGTH,
} from "@/functions/_shared/fal-request-validation.ts";

const TRUSTED_FAL_IMAGE_BASE_HOST = "fal.media";
const DEFAULT_INPAINT_BASE_IMAGE_ALLOWED_HOSTS = [
  TRUSTED_FAL_IMAGE_BASE_HOST,
  "ik.imagekit.io",
];
const BLOCKED_INPAINT_BASE_IMAGE_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "169.254.169.254",
]);
const MAX_REMOTE_INPAINT_IMAGE_BYTES = Math.floor(
  (MAX_IMAGE_BASE64_LENGTH * 3) / 4,
);

const normalizeHostname = (value: string): string => value.trim().toLowerCase();

const normalizeMimeType = (value: string | null): string =>
  (value ?? "").split(";")[0]?.trim().toLowerCase() ?? "";

const parseAllowedHost = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return normalizeHostname(new URL(trimmed).hostname);
  } catch {
    return normalizeHostname(trimmed);
  }
};

const isIpv4Address = (hostname: string): boolean => {
  const segments = hostname.split(".");
  return (
    segments.length === 4 &&
    segments.every(
      (segment) =>
        segment.length > 0 && segment.length <= 3 && /^[0-9]+$/.test(segment),
    )
  );
};

const isBlockedIpv4Address = (hostname: string): boolean => {
  if (!isIpv4Address(hostname)) {
    return false;
  }

  const octets = hostname.split(".").map(Number);
  const [first, second] = octets;
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const isAllowedHostname = (
  hostname: string,
  allowedHosts: readonly string[],
): boolean => {
  const normalizedHostname = normalizeHostname(hostname);

  return allowedHosts.some((allowedHost) => {
    const normalizedAllowedHost = normalizeHostname(allowedHost);
    return (
      normalizedHostname === normalizedAllowedHost ||
      normalizedHostname.endsWith(`.${normalizedAllowedHost}`)
    );
  });
};

const parseContentLength = (headers: Headers): number | null => {
  const contentRange = headers.get("content-range");
  const totalLengthMatch = contentRange?.match(/\/(\d+)$/);
  if (totalLengthMatch?.[1]) {
    return Number(totalLengthMatch[1]);
  }

  const contentLengthHeader = headers.get("content-length");
  if (contentLengthHeader && /^\d+$/.test(contentLengthHeader)) {
    return Number(contentLengthHeader);
  }

  return null;
};

const shouldRetryWithRangeGet = (response: Response): boolean =>
  response.status === 405 ||
  response.status === 501 ||
  response.headers.get("content-type") === null ||
  parseContentLength(response.headers) === null;

const cancelResponseBody = (response: Response) => {
  void response.body?.cancel();
};

const isRedirectResponse = (response: Response): boolean =>
  response.status >= 300 && response.status < 400;

export const buildAllowedInpaintBaseImageHosts = (
  input: {
    supabaseUrl?: string | null;
    imagekitUrlEndpoint?: string | null;
    extraHosts?: string[];
  } = {},
): string[] => {
  const hosts = new Set(DEFAULT_INPAINT_BASE_IMAGE_ALLOWED_HOSTS);

  for (const value of [
    input.supabaseUrl,
    input.imagekitUrlEndpoint,
    ...(input.extraHosts ?? []),
  ]) {
    const host = parseAllowedHost(value);
    if (host) {
      hosts.add(host);
    }
  }

  return [...hosts];
};

export const getTrustedFalImageUrl = (value: string): string | null => {
  try {
    const parsedUrl = new URL(value);
    const host = parsedUrl.hostname;
    const isTrustedHost =
      host === TRUSTED_FAL_IMAGE_BASE_HOST ||
      host.endsWith(`.${TRUSTED_FAL_IMAGE_BASE_HOST}`);

    if (parsedUrl.protocol !== "https:" || !isTrustedHost) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const buildFalErrorResponseBody = <T extends Record<string, unknown>>(
  error: string,
  analysisResponseBody: T,
): T & { error: string } => ({
  error,
  ...analysisResponseBody,
});

export const resolveInpaintBaseImageUrl = (input: {
  baseImageUrl?: string | null;
  baseImageBase64?: string;
  baseImageMimeType?: string;
}): string | undefined => {
  const base64 = input.baseImageBase64?.trim();
  const mimeType = input.baseImageMimeType?.trim();
  if (base64 && mimeType) {
    return undefined;
  }

  const baseImageUrl = input.baseImageUrl?.trim();
  return baseImageUrl ? baseImageUrl : undefined;
};

export const getGenerationLogUserMessage = (input: {
  payloadUserMessage?: string | null;
  analysisUserMessage?: string | null;
}): {
  userMessage: string;
  promptLength: number;
} => {
  const userMessage =
    input.analysisUserMessage ?? input.payloadUserMessage ?? "";
  return {
    userMessage,
    promptLength: userMessage.length,
  };
};

export const shouldExecuteFalRender = (
  generateImage: boolean,
  eligibility: {
    eligibleForRender: boolean;
    missingRequirements: string[];
  },
): boolean =>
  generateImage &&
  eligibility.eligibleForRender &&
  eligibility.missingRequirements.length === 0;

export const validateRemoteInpaintBaseImageUrl = (
  value: string,
  allowedHosts: readonly string[],
): string | null => {
  try {
    const parsedUrl = new URL(value.trim());
    const hostname = normalizeHostname(parsedUrl.hostname);

    if (
      parsedUrl.protocol !== "https:" ||
      BLOCKED_INPAINT_BASE_IMAGE_HOSTS.has(hostname) ||
      isBlockedIpv4Address(hostname) ||
      !isAllowedHostname(hostname, allowedHosts)
    ) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const parseValidatedInpaintDataUri = (
  value: string,
): { mimeType: string; base64: string } | null => {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = normalizeMimeType(match[1]);
  const base64 = match[2].trim();
  if (!ALLOWED_TILED_MIME_TYPES.has(mimeType) || base64.length === 0) {
    return null;
  }

  if (base64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error("base_image_url_data_uri_too_large");
  }

  return { mimeType, base64 };
};

export const inspectRemoteInpaintImage = async (
  imageUrl: string,
  input: {
    allowedHosts: readonly string[];
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<{
  url: string;
  mimeType: string;
  contentLength: number;
}> => {
  const validatedUrl = validateRemoteInpaintBaseImageUrl(
    imageUrl,
    input.allowedHosts,
  );
  if (!validatedUrl) {
    throw new Error("base_image_url_not_allowed");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const timeoutMs = input.timeoutMs ?? 10_000;

  let response = await fetchImpl(validatedUrl, {
    method: "HEAD",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (isRedirectResponse(response)) {
    cancelResponseBody(response);
    throw new Error("base_image_url_redirect_not_allowed");
  }

  if (shouldRetryWithRangeGet(response)) {
    cancelResponseBody(response);
    response = await fetchImpl(validatedUrl, {
      method: "GET",
      headers: {
        Range: "bytes=0-0",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (isRedirectResponse(response)) {
      cancelResponseBody(response);
      throw new Error("base_image_url_redirect_not_allowed");
    }
  }

  if (!response.ok) {
    cancelResponseBody(response);
    throw new Error(`base_image_url_probe_failed:${response.status}`);
  }

  const finalUrl = validateRemoteInpaintBaseImageUrl(
    response.url || validatedUrl,
    input.allowedHosts,
  );
  if (!finalUrl) {
    cancelResponseBody(response);
    throw new Error("base_image_url_redirect_not_allowed");
  }

  const mimeType = normalizeMimeType(response.headers.get("content-type"));
  if (!ALLOWED_TILED_MIME_TYPES.has(mimeType)) {
    cancelResponseBody(response);
    throw new Error("base_image_url_content_type_not_allowed");
  }

  const contentLength = parseContentLength(response.headers);
  if (contentLength === null) {
    cancelResponseBody(response);
    throw new Error("base_image_url_content_length_missing");
  }

  if (contentLength <= 0) {
    cancelResponseBody(response);
    throw new Error("base_image_url_empty");
  }

  if (contentLength > MAX_REMOTE_INPAINT_IMAGE_BYTES) {
    cancelResponseBody(response);
    throw new Error("base_image_url_too_large");
  }

  cancelResponseBody(response);
  return {
    url: finalUrl,
    mimeType,
    contentLength,
  };
};
