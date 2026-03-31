import type {
  MarketingConsent,
  UserProfile,
} from "@/entities/my-page/model/profile";
import { supabase } from "@/shared/lib/supabase";
import { toUserProfile } from "./profile-mapper";

const TABLE_NAME = "profiles";
const PROFILE_SELECT_FIELDS =
  "id, name, phone, birth, phone_verified, notification_consent, notification_enabled, marketing_kakao_sms_consent";

export const getProfile = async (): Promise<UserProfile> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data: profile, error: profileError } = await supabase
    .from(TABLE_NAME)
    .select(PROFILE_SELECT_FIELDS)
    .eq("id", user.id)
    .single();

  if (profileError) {
    if (profileError.code === "PGRST116") {
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

export const updateMarketingConsent = async (
  input: MarketingConsent,
): Promise<void> => {
  const { error } = await supabase.rpc("set_marketing_consent", {
    p_kakao_sms_consent: input.kakaoSms,
  });

  if (error) {
    throw new Error(`마케팅 동의 저장 실패: ${error.message}`);
  }
};
