const ALLOWED_IMAGE_HOSTS = new Set(["ik.imagekit.io"]);

export function buildAllowedReferenceImageHosts(input: {
  supabaseUrl?: string;
  imagekitUrlEndpoint?: string;
}): string[] {
  const hosts = new Set(ALLOWED_IMAGE_HOSTS);

  for (const value of [input.supabaseUrl, input.imagekitUrlEndpoint]) {
    if (!value) continue;

    try {
      hosts.add(new URL(value).hostname);
    } catch {
      // Ignore malformed optional env values. The final URL validator rejects
      // any reference URL whose host is not in the allowlist.
    }
  }

  return [...hosts];
}

export function validateRemoteReferenceImageUrl(
  value: string,
  allowedHosts: readonly string[],
): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return null;
    }

    return allowedHosts.includes(parsed.hostname) ? parsed.toString() : null;
  } catch {
    return null;
  }
}
