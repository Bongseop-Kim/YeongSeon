import { supabase } from "@/lib/supabase";

const TABLE_NAME = "profiles";
const MARKETING_CONSENT_KEY = "marketingConsent";

/**
 * 프로필 레코드 타입
 */
export interface ProfileRecord {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  birth: string | null; // DATE 타입은 문자열로 반환됨
  role: "customer" | "admin" | "manager";
  is_active: boolean;
}

export interface MarketingConsent {
  all: boolean;
  channels: {
    sms: boolean;
    email: boolean;
    [channel: string]: boolean;
  };
}

export interface MarketingConsentToggleInput {
  target: "all" | "sms" | "email";
  checked: boolean;
}

export const DEFAULT_MARKETING_CONSENT: MarketingConsent = {
  all: false,
  channels: {
    sms: false,
    email: false,
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeMarketingConsent = (value: unknown): MarketingConsent => {
  if (!isRecord(value)) {
    return DEFAULT_MARKETING_CONSENT;
  }

  const channelsRaw = isRecord(value.channels) ? value.channels : {};
  const normalizedChannels = Object.entries(channelsRaw).reduce(
    (acc, [key, channelValue]) => {
      if (typeof channelValue === "boolean") {
        acc[key] = channelValue;
      }
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const channels = {
    ...DEFAULT_MARKETING_CONSENT.channels,
    ...normalizedChannels,
  };
  const hasEnabledChannel = Object.values(channels).some(Boolean);
  const allRaw = value.all;
  const all = typeof allRaw === "boolean" ? allRaw : hasEnabledChannel;

  if (!all) {
    const disabledChannels = Object.keys(channels).reduce(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {} as Record<string, boolean>,
    );

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
    return {
      all: input.checked,
      channels: Object.keys(base.channels).reduce(
        (acc, key) => {
          acc[key] = input.checked;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
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

/**
 * 사용자 프로필 정보 타입
 */
export interface UserProfile {
  id: string;
  name: string;
  phone: string | null;
  birth: string | null;
  email: string;
  marketingConsent: MarketingConsent;
}

/**
 * 현재 사용자의 프로필 조회
 * auth.users의 email과 profiles 테이블을 조인하여 반환
 */
export const getProfile = async (): Promise<UserProfile> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  // 프로필 정보 조회
  const { data: profile, error: profileError } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    // 프로필이 없는 경우 기본 프로필 생성
    if (profileError.code === "PGRST116") {
      // 기본 프로필 생성
      const { data: newProfile, error: createError } = await supabase
        .from(TABLE_NAME)
        .insert({
          id: user.id,
          name:
            user.user_metadata?.name || user.email?.split("@")[0] || "사용자",
          phone: null,
          birth: null,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`프로필 생성 실패: ${createError.message}`);
      }

      return {
        id: newProfile.id,
        name: newProfile.name,
        phone: newProfile.phone,
        birth: newProfile.birth,
        email: user.email || "",
        marketingConsent: normalizeMarketingConsent(
          isRecord(user.user_metadata)
            ? user.user_metadata[MARKETING_CONSENT_KEY]
            : undefined,
        ),
      };
    }
    throw new Error(`프로필 조회 실패: ${profileError.message}`);
  }

  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    birth: profile.birth,
    email: user.email || "",
    marketingConsent: normalizeMarketingConsent(
      isRecord(user.user_metadata)
        ? user.user_metadata[MARKETING_CONSENT_KEY]
        : undefined,
    ),
  };
};

/**
 * 프로필 정보 업데이트
 */
export const updateProfile = async (data: {
  name?: string;
  phone?: string | null;
  birth?: string | null;
}): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const updateData: Partial<ProfileRecord> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.birth !== undefined) updateData.birth = data.birth;

  const { data: updatedProfile, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`프로필 업데이트 실패: ${error.message}`);
  }

  if (!updatedProfile) {
    throw new Error("프로필이 존재하지 않습니다.");
  }
};

/**
 * 마케팅 수신 동의 업데이트
 * 확장성을 위해 auth.users.user_metadata에 저장한다.
 */
export const updateMarketingConsent = async (
  input: MarketingConsent,
): Promise<MarketingConsent> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`사용자 조회 실패: ${userError.message}`);
  }

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const currentMetadata = isRecord(user.user_metadata) ? user.user_metadata : {};
  const nextConsent = normalizeMarketingConsent(input);

  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...currentMetadata,
      [MARKETING_CONSENT_KEY]: nextConsent,
    },
  });

  if (error) {
    throw new Error(`마케팅 동의 저장 실패: ${error.message}`);
  }

  const updatedUser = data.user;
  return normalizeMarketingConsent(
    isRecord(updatedUser?.user_metadata)
      ? updatedUser.user_metadata[MARKETING_CONSENT_KEY]
      : nextConsent,
  );
};
