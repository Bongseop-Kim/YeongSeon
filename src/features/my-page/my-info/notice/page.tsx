import { useEffect } from "react";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Controller, useForm } from "react-hook-form";
import { Empty } from "@/components/composite/empty";
import {
  applyMarketingConsentToggle,
  DEFAULT_MARKETING_CONSENT,
} from "@/features/my-page/api/profile-api";
import {
  useProfile,
  useUpdateMarketingConsent,
} from "@/features/my-page/api/profile-query";

interface NoticeFormValues {
  isMarketingConsent: boolean;
  isSmsConsent: boolean;
  isEmailConsent: boolean;
}

export default function MyInfoNoticePage() {
  const { data: profile, isLoading, isError, error } = useProfile();
  const updateMarketingConsentMutation = useUpdateMarketingConsent();

  const form = useForm<NoticeFormValues>({
    defaultValues: {
      isMarketingConsent: false,
      isSmsConsent: false,
      isEmailConsent: false,
    },
  });
  const isSaving = updateMarketingConsentMutation.isPending;

  useEffect(() => {
    const marketingConsent = profile?.marketingConsent ?? DEFAULT_MARKETING_CONSENT;
    form.reset({
      isMarketingConsent: marketingConsent.all,
      isSmsConsent: marketingConsent.channels.sms,
      isEmailConsent: marketingConsent.channels.email,
    });
  }, [form, profile]);

  const handleToggle = async (
    target: "all" | "sms" | "email",
    checked: boolean,
  ) => {
    const currentValues = form.getValues();
    const nextConsent = applyMarketingConsentToggle(
      {
        all: currentValues.isMarketingConsent,
        channels: {
          sms: currentValues.isSmsConsent,
          email: currentValues.isEmailConsent,
        },
      },
      { target, checked },
    );

    form.setValue("isMarketingConsent", nextConsent.all);
    form.setValue("isSmsConsent", nextConsent.channels.sms);
    form.setValue("isEmailConsent", nextConsent.channels.email);

    try {
      await updateMarketingConsentMutation.mutateAsync(nextConsent);
    } catch {
      // rollback은 query mutation onError에서 처리
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              수신 동의 정보를 불러오는 중...
            </CardContent>
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  if (isError) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="수신 동의 정보를 불러오지 못했습니다."
              description={
                error instanceof Error
                  ? error.message
                  : "잠시 후 다시 시도해주세요."
              }
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>
                  마케팅 목적의 개인정보 수집 및 이용 동의 (선택)
                </CardTitle>
                <Controller
                  name="isMarketingConsent"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        void handleToggle("all", checked);
                      }}
                      disabled={isSaving}
                    />
                  )}
                />
              </CardHeader>
              <Separator />

              <CardContent className="space-y-4">
                <Label
                  className="font-bold text-base"
                  subLabel="다양한 혜택과 이벤트 알림"
                >
                  문자/이메일
                </Label>

                <div className="flex items-center justify-between">
                  <Label className="font-bold">문자</Label>
                  <Controller
                  name="isSmsConsent"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        void handleToggle("sms", checked);
                      }}
                      disabled={isSaving}
                    />
                  )}
                />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-bold">이메일</Label>
                  <Controller
                  name="isEmailConsent"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        void handleToggle("email", checked);
                      }}
                      disabled={isSaving}
                    />
                  )}
                />
                </div>

                <Separator />

                <Label
                  subLabel={
                    <>
                      <p>서비스 알림은 수신설정에 상관없이 발송됩니다.</p>
                      <p>푸시 알림은 설정에 따라 발송됩니다.</p>
                      <p>{`[푸시 설정 확인 : 앱 > 마이 > 설정 > 알림설정]`}</p>
                    </>
                  }
                >
                  알림 안내
                </Label>
              </CardContent>
            </Card>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
