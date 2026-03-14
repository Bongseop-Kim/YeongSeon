import type {
  MarketingConsent,
  MarketingConsentToggleInput,
} from "@/features/my-page/types/profile";

export const DEFAULT_MARKETING_CONSENT: MarketingConsent = {
  all: false,
  channels: {
    sms: false,
    email: false,
  },
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeMarketingConsent = (value: unknown): MarketingConsent => {
  if (!isRecord(value)) {
    return DEFAULT_MARKETING_CONSENT;
  }

  const channelsRaw = isRecord(value.channels) ? value.channels : {};
  const normalizedChannels = Object.entries(channelsRaw).reduce<
    Record<string, boolean>
  >((acc, [key, channelValue]) => {
    if (typeof channelValue === "boolean") {
      acc[key] = channelValue;
    }
    return acc;
  }, {});

  const channels = {
    ...DEFAULT_MARKETING_CONSENT.channels,
    ...normalizedChannels,
  };
  const hasEnabledChannel = Object.values(channels).some(Boolean);
  const allRaw = value.all;
  const all = typeof allRaw === "boolean" ? allRaw : hasEnabledChannel;

  if (!all) {
    const disabledChannels = Object.keys(channels).reduce<
      Record<string, boolean>
    >((acc, key) => {
      acc[key] = false;
      return acc;
    }, {});

    return {
      all: false,
      channels: {
        ...DEFAULT_MARKETING_CONSENT.channels,
        ...disabledChannels,
      },
    };
  }

  return {
    all: true,
    channels,
  };
};

export const applyMarketingConsentToggle = (
  current: MarketingConsent,
  input: MarketingConsentToggleInput,
): MarketingConsent => {
  const base = normalizeMarketingConsent(current);

  if (input.target === "all") {
    const allChannels = Object.keys(base.channels).reduce<
      Record<string, boolean>
    >(
      (acc, key) => {
        acc[key] = input.checked;
        return acc;
      },
      { ...DEFAULT_MARKETING_CONSENT.channels },
    );

    return {
      all: input.checked,
      channels: {
        ...DEFAULT_MARKETING_CONSENT.channels,
        ...allChannels,
      },
    };
  }

  const nextChannels = {
    ...base.channels,
    [input.target]: input.checked,
  };

  return normalizeMarketingConsent({
    all: Object.values(nextChannels).some(Boolean),
    channels: nextChannels,
  });
};
