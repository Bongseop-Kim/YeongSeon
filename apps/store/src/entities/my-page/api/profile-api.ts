import { supabase } from "@/shared/lib/supabase";
import type {
  UserProfile,
  MarketingConsent,
} from "@/entities/my-page/model/profile";
import { isRecord } from "@/shared/lib/type-guard";
import {
  MARKETING_CONSENT_KEY,
  normalizeMarketingConsent,
  toUserProfile,
} from "./profile-mapper";

const TABLE_NAME = "profiles";
const PROFILE_SELECT_FIELDS =
  "id, name, phone, birth, phone_verified, notification_consent, notification_enabled";

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
    .select(PROFILE_SELECT_FIELDS)
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
        .select(PROFILE_SELECT_FIELDS)
        .single();

      if (createError) {
        throw new Error(`프로필 생성 실패: ${createError.message}`);
      }

      return toUserProfile(newProfile, user);
    }
    throw new Error(`프로필 조회 실패: ${profileError.message}`);
  }

  return toUserProfile(profile, user);
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

  const currentMetadata = isRecord(user.user_metadata)
    ? user.user_metadata
    : {};
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
