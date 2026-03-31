import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BellRingIcon, UserRoundIcon } from "lucide-react";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Button } from "@/shared/ui-extended/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Switch } from "@/shared/ui/switch";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useProfile } from "@/entities/my-page";
import {
  saveNotificationConsent,
  updateNotificationEnabled,
} from "@/entities/notification";
import { notificationStatusKeys } from "@/entities/notification";
import { PhoneVerificationForm } from "@/features/notification";
import { toast } from "@/shared/lib/toast";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";

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
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Profile Detail"
              title="회원정보 변경"
              description="현재 계정에 저장된 기본 정보를 확인하고 알림 상태를 조정합니다."
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0 space-y-8">
                <UtilityPageSection
                  icon={UserRoundIcon}
                  title="기본 정보"
                  description="주문과 알림에 사용되는 현재 저장 정보를 보여줍니다."
                >
                  {isLoading ? (
                    <div
                      className="py-8 text-sm text-zinc-500"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      프로필 정보를 불러오는 중입니다.
                    </div>
                  ) : profile ? (
                    <dl>
                      <UtilityKeyValueRow
                        label="이름"
                        value={profile.name || "-"}
                      />
                      <UtilityKeyValueRow
                        label="생년월일"
                        value={profile.birth || "-"}
                      />
                      <UtilityKeyValueRow
                        label="휴대폰 번호"
                        value={profile.phone || "-"}
                      />
                      <UtilityKeyValueRow
                        label="이메일"
                        value={profile.email || "-"}
                      />
                    </dl>
                  ) : (
                    <div
                      className="py-8 text-sm text-red-500"
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                    >
                      프로필을 불러올 수 없습니다.
                    </div>
                  )}
                </UtilityPageSection>

                <UtilityPageSection
                  icon={BellRingIcon}
                  title="알림 수신"
                  description="주문 변경과 상태 알림 수신 여부를 설정합니다."
                >
                  <div className="flex items-center justify-between border-b border-stone-200 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-950">
                        카카오톡/문자 알림
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        주문·수선·제작 등 서비스 알림을 카카오톡으로 받습니다.
                      </p>
                    </div>
                    <Switch
                      checked={profile?.notificationEnabled ?? false}
                      onCheckedChange={handleNotificationToggle}
                      disabled={!profile}
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO_NOTICE)}
                    >
                      수신 동의 상세 설정
                    </Button>
                  </div>
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
                <UtilityPageAside
                  title="다음 작업"
                  description="자주 사용하는 정보 변경 경로입니다."
                  tone="muted"
                >
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      disabled
                      aria-disabled="true"
                      title="준비 중인 기능입니다."
                    >
                      회원정보 변경 준비 중
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO_EMAIL)}
                      disabled={isLoading || !profile}
                    >
                      이메일 변경
                    </Button>
                  </div>
                </UtilityPageAside>
              </div>
            </div>

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
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
