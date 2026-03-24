import { supabase } from "@/lib/supabase";

export const sendPhoneVerification = async (phone: string): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-verification`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
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

// profiles 직접 UPDATE 예외: notification_consent, notification_enabled는
// GRANT UPDATE 및 RLS("id = auth.uid()")로 소유권이 보장되어 있어 직접 쓰기 허용.
const updateNotificationField = async (patch: {
  notification_consent?: boolean;
  notification_enabled?: boolean;
}): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) throw error;
};

export const saveNotificationConsent = (consent: boolean) =>
  updateNotificationField({ notification_consent: consent });

export const updateNotificationEnabled = (enabled: boolean) =>
  updateNotificationField({ notification_enabled: enabled });
