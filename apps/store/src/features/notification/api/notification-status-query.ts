import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface NotificationStatus {
  phoneVerified: boolean;
  notificationConsent: boolean;
}

interface NotificationStatusRow {
  phone_verified: boolean | null;
  notification_consent: boolean | null;
}

const getNotificationStatus = async (): Promise<NotificationStatus> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("phone_verified, notification_consent")
    .eq("id", user.id)
    .single<NotificationStatusRow>();

  if (error) {
    throw new Error(`알림 상태 조회 실패: ${error.message}`);
  }

  return {
    phoneVerified: data.phone_verified ?? false,
    notificationConsent: data.notification_consent ?? false,
  };
};

export const notificationStatusKeys = {
  all: ["notification-status"] as const,
  detail: () => [...notificationStatusKeys.all, "detail"] as const,
};

export const useNotificationStatus = () => {
  return useQuery({
    queryKey: notificationStatusKeys.detail(),
    queryFn: getNotificationStatus,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};
