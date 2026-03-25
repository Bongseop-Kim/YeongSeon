import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/constants/ROUTES";
import { useProfile } from "@/features/my-page/api/profile-query";
import {
  saveNotificationConsent,
  updateNotificationEnabled,
} from "@/features/notification/api/notification-api";
import { notificationStatusKeys } from "@/features/notification/api/notification-status-query";
import { PhoneVerificationForm } from "@/features/notification/components/phone-verification-form";
import { toast } from "@/lib/toast";
import { ProfileItem } from "./components/profile-item";

export default function MyInfoDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading, refetch } = useProfile();
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const handleNotificationToggle = async (val: boolean) => {
    if (!profile) return;

    if (val && !profile.phoneVerified) {
      setShowVerifyModal(true);
      return;
    }

    try {
      if (val && !profile.notificationConsent) {
        await saveNotificationConsent(true);
      }

      await updateNotificationEnabled(val);
      await refetch();
      void queryClient.invalidateQueries({
        queryKey: notificationStatusKeys.detail(),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "알림 설정 변경에 실패했습니다.";
      console.error("Failed to update notification setting:", error);
      toast.error(message);
    }
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <Card>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div
                  className="text-center py-4"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  로딩 중...
                </div>
              ) : profile ? (
                <>
                  <ProfileItem label="이름" value={profile.name || "-"} />
                  <ProfileItem label="생년월일" value={profile.birth || "-"} />
                  <ProfileItem
                    label="휴대폰번호"
                    value={profile.phone || "-"}
                  />
                  <ProfileItem label="이메일" value={profile.email || "-"} />
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm">알림 수신</span>
                    <Switch
                      checked={profile.notificationEnabled}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="text-center py-4 text-red-500"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  프로필을 불러올 수 없습니다.
                </div>
              )}
            </CardContent>

            <Dialog
              open={showVerifyModal}
              onOpenChange={(open) => !open && setShowVerifyModal(false)}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>전화번호 인증</DialogTitle>
                </DialogHeader>
                <PhoneVerificationForm
                  onVerified={async () => {
                    try {
                      await saveNotificationConsent(true);
                      await updateNotificationEnabled(true);
                      setShowVerifyModal(false);
                      await refetch();
                      await queryClient.invalidateQueries({
                        queryKey: notificationStatusKeys.detail(),
                      });
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "알림 활성화에 실패했습니다.";
                      console.error("Failed to enable notification:", error);
                      toast.error(message);
                    }
                  }}
                />
              </DialogContent>
            </Dialog>

            <div className="flex gap-2 mt-4 px-4">
              <Button
                variant="outline"
                className="flex-1"
                disabled
                aria-disabled="true"
                title="준비 중인 기능입니다."
              >
                회원정보 변경
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigate(ROUTES.MY_PAGE_MY_INFO_EMAIL);
                }}
                disabled={isLoading || !profile}
                aria-disabled={isLoading || !profile}
              >
                이메일 변경
              </Button>
            </div>
          </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
