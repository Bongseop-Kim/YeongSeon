import { supabase } from "@/shared/lib/supabase";

export const sendPhoneVerification = async (phone: string): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("로그인이 필요합니다.");
  }

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-verification`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ phone }),
    },
  );
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? "발송 실패");
  }
};

export const verifyPhone = async (
  phone: string,
  code: string,
): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-phone`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ phone, code }),
    },
  );
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? "인증 실패");
  }
};

const updateNotificationPreferences = async (patch: {
  notification_consent?: boolean;
  notification_enabled?: boolean;
}): Promise<void> => {
  const { error } = await supabase.rpc("set_notification_preferences", {
    p_notification_consent: patch.notification_consent ?? null,
    p_notification_enabled: patch.notification_enabled ?? null,
  });

  if (error) {
    throw error;
  }
};

export const saveNotificationConsent = (consent: boolean) =>
  updateNotificationPreferences({ notification_consent: consent });

export const updateNotificationEnabled = (enabled: boolean) =>
  updateNotificationPreferences({ notification_enabled: enabled });
