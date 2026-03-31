import type { UserProfile } from "@/entities/my-page/model/profile";

interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
  birth: string | null;
  phone_verified?: boolean | null;
  notification_consent?: boolean | null;
  notification_enabled?: boolean | null;
  marketing_kakao_sms_consent?: boolean | null;
}

export const toUserProfile = (
  profile: ProfileRow,
  user: { email?: string | null; user_metadata?: unknown },
): UserProfile => ({
  id: profile.id,
  name: profile.name,
  phone: profile.phone,
  birth: profile.birth,
  email: user.email ?? "",
  marketingConsent: {
    kakaoSms: profile.marketing_kakao_sms_consent ?? false,
  },
  phoneVerified: profile.phone_verified ?? false,
  notificationConsent: profile.notification_consent ?? false,
  notificationEnabled: profile.notification_enabled ?? true,
});
