import { supabase } from "@/lib/supabase";
import type { UserProfile, MarketingConsent } from "@/features/my-page/types/profile";
import type { ProfileRecord } from "@/features/my-page/types/dto/profile";
import { isRecord, normalizeMarketingConsent } from "./profile-mapper";

const TABLE_NAME = "profiles";
const MARKETING_CONSENT_KEY = "marketingConsent";

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
