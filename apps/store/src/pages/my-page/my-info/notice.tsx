import { useEffect, useState } from "react";
import { Controller, type UseFormReturn, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile, useUpdateMarketingConsent } from "@/entities/my-page";
import {
  notificationStatusKeys,
  setNotificationPreferences,
} from "@/entities/notification";
import { PhoneVerificationForm } from "@/features/notification";
import { Empty } from "@/shared/composite/empty";
import {
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { toast } from "@/shared/lib/toast";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Switch } from "@/shared/ui/switch";

interface NoticeFormValues {
  kakaoSms: boolean;
  notificationEnabled: boolean;
}

async function applyNotificationUpdateRollback(params: {
  previousValue: boolean;
  form: UseFormReturn<NoticeFormValues>;
  queryClient: ReturnType<typeof useQueryClient>;
  refetch: () => Promise<unknown>;
  error: unknown;
}) {
  await params.refetch();
  await params.queryClient.invalidateQueries({
    queryKey: notificationStatusKeys.detail(),
  });
  params.form.setValue("notificationEnabled", params.previousValue);

  const message =
    params.error instanceof Error
      ? params.error.message
      : "알림 설정 변경에 실패했습니다.";
  toast.error(message);
}

async function updateNotificationPreference(params: {
  desiredValues: {
    notificationConsent: boolean;
    notificationEnabled: boolean;
  };
  previousValue: boolean;
  form: UseFormReturn<NoticeFormValues>;
  queryClient: ReturnType<typeof useQueryClient>;
  refetch: () => Promise<unknown>;
  setIsSavingNotification: (isSaving: boolean) => void;
  setShowVerifyModal?: (open: boolean) => void;
}) {
  params.form.setValue(
    "notificationEnabled",
    params.desiredValues.notificationEnabled,
  );
  params.setIsSavingNotification(true);

  try {
    await setNotificationPreferences(params.desiredValues);
    params.setShowVerifyModal?.(false);
    await params.refetch();
    await params.queryClient.invalidateQueries({
      queryKey: notificationStatusKeys.detail(),
    });
  } catch (error) {
    await applyNotificationUpdateRollback({
      previousValue: params.previousValue,
      form: params.form,
      queryClient: params.queryClient,
      refetch: params.refetch,
      error,
    });
  } finally {
    params.setIsSavingNotification(false);
  }
}

export default function MyInfoNoticePage() {
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateMarketingConsentMutation = useUpdateMarketingConsent();
  const queryClient = useQueryClient();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isSavingNotification, setIsSavingNotification] = useState(false);

  const form = useForm<NoticeFormValues>({
    defaultValues: { kakaoSms: false, notificationEnabled: false },
  });
  const isSavingMarketing = updateMarketingConsentMutation.isPending;

  useEffect(() => {
    form.reset({
      kakaoSms: profile?.marketingConsent.kakaoSms ?? false,
      notificationEnabled: profile?.notificationEnabled ?? false,
    });
  }, [form, profile]);

  const handleMarketingToggle = async (checked: boolean) => {
    form.setValue("kakaoSms", checked);
    try {
      await updateMarketingConsentMutation.mutateAsync({ kakaoSms: checked });
    } catch {
      await refetch();
      toast.error("설정 저장에 실패했습니다.");
    }
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (!profile || isSavingNotification) return;

    if (checked && !profile.phoneVerified) {
      setShowVerifyModal(true);
      return;
    }

    const previousValue = form.getValues("notificationEnabled");
    await updateNotificationPreference({
      desiredValues: {
        notificationConsent: checked,
        notificationEnabled: checked,
      },
      previousValue,
      form,
      queryClient,
      refetch,
      setIsSavingNotification,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="py-12 text-center text-zinc-500">
            수신 동의 정보를 불러오는 중...
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (isError) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-4 lg:py-8">
            <Empty
              title="수신 동의 정보를 불러오지 못했습니다."
              description={
                error instanceof Error
                  ? error.message
                  : "잠시 후 다시 시도해주세요."
              }
            />
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Notification Settings"
              title="서비스 알림 및 마케팅 수신 동의"
              description="주문·수선 등 서비스 알림과 마케팅 수신 동의를 관리합니다."
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0 space-y-8">
                <UtilityPageSection
                  title="서비스 알림"
                  description="주문·수선·제작 등 서비스 변경 알림입니다. 마케팅과 무관하며 서비스 이용에 필요한 알림입니다."
                >
                  <div className="flex items-center justify-between border-b border-stone-200 py-3">
                    <Field className="gap-0">
                      <FieldContent className="gap-1">
                        <FieldLabel
                          id="notification-switch-label"
                          htmlFor="notification-switch"
                          className="block"
                        >
                          <FieldTitle>카카오톡/문자 알림</FieldTitle>
                        </FieldLabel>
                        <FieldDescription>
                          주문·수선·제작 등 서비스 알림을 카카오톡/문자로
                          받습니다.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                    <Controller
                      name="notificationEnabled"
                      control={form.control}
                      render={({ field }) => (
                        <Switch
                          id="notification-switch"
                          aria-labelledby="notification-switch-label"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            void handleNotificationToggle(checked);
                          }}
                          disabled={!profile || isSavingNotification}
                        />
                      )}
                    />
                  </div>
                  <p className="pt-3 text-sm text-zinc-500">
                    알림을 끄면 주문 확인을 앱에서 직접 확인해야 하는 불편함이
                    있습니다.
                  </p>
                </UtilityPageSection>

                <UtilityPageSection
                  title="마케팅 수신 동의"
                  description="혜택, 이벤트, 프로모션 알림입니다. (선택)"
                >
                  <div className="flex items-center justify-between border-b border-stone-200 py-3">
                    <Field className="gap-0">
                      <FieldContent className="gap-1">
                        <FieldLabel
                          id="kakao-sms-switch-label"
                          htmlFor="kakao-sms-switch"
                          className="block"
                        >
                          <FieldTitle>카카오톡/문자</FieldTitle>
                        </FieldLabel>
                        <FieldDescription>
                          마케팅 목적의 개인정보 수집 및 이용 동의 (선택)
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                    <Controller
                      name="kakaoSms"
                      control={form.control}
                      render={({ field }) => (
                        <Switch
                          id="kakao-sms-switch"
                          aria-labelledby="kakao-sms-switch-label"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            void handleMarketingToggle(checked);
                          }}
                          disabled={isSavingMarketing}
                        />
                      )}
                    />
                  </div>
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
                <UtilityPageAside title="알림 안내" tone="muted">
                  {profile && !profile.phoneVerified ? (
                    <p className="text-sm text-zinc-600">
                      휴대폰 인증 및 수신 동의를 하지 않으면 주문 완료 및 진행
                      상황을 카카오톡 또는 메신저로 받을 수 없습니다.
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-600">
                      서비스 알림은 마케팅 동의와 무관하게 발송됩니다.
                    </p>
                  )}
                </UtilityPageAside>
              </div>
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
                  if (isSavingNotification) return;

                  const previousValue = form.getValues("notificationEnabled");
                  await updateNotificationPreference({
                    desiredValues: {
                      notificationConsent: true,
                      notificationEnabled: true,
                    },
                    previousValue,
                    form,
                    queryClient,
                    refetch,
                    setIsSavingNotification,
                    setShowVerifyModal,
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
