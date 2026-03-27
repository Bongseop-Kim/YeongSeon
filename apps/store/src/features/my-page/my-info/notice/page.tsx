import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Empty } from "@/components/composite/empty";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import {
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { FieldTitle } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  applyMarketingConsentToggle,
  DEFAULT_MARKETING_CONSENT,
} from "@/features/my-page/api/profile-mapper";
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
    const marketingConsent =
      profile?.marketingConsent ?? DEFAULT_MARKETING_CONSENT;
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
          ...(profile?.marketingConsent?.channels ?? {}),
          sms: currentValues.isSmsConsent,
          email: currentValues.isEmailConsent,
        },
      },
      { target, checked },
    );

    const previousFormValues = {
      isMarketingConsent: currentValues.isMarketingConsent,
      isSmsConsent: currentValues.isSmsConsent,
      isEmailConsent: currentValues.isEmailConsent,
    };

    form.setValue("isMarketingConsent", nextConsent.all);
    form.setValue("isSmsConsent", nextConsent.channels.sms);
    form.setValue("isEmailConsent", nextConsent.channels.email);

    try {
      await updateMarketingConsentMutation.mutateAsync(nextConsent);
    } catch {
      form.setValue(
        "isMarketingConsent",
        previousFormValues.isMarketingConsent,
      );
      form.setValue("isSmsConsent", previousFormValues.isSmsConsent);
      form.setValue("isEmailConsent", previousFormValues.isEmailConsent);
      toast.error("설정 저장에 실패했습니다.");
    }
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
              eyebrow="Consent Settings"
              title="마케팅 수신 동의"
              description="혜택, 이벤트, 프로모션 알림에 대한 채널별 동의 상태를 관리합니다."
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0">
                <UtilityPageSection
                  title="수신 채널 설정"
                  description="전체 동의를 켜면 문자와 이메일 채널이 함께 반영됩니다."
                >
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4 border-b border-stone-200 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-950">
                          전체 동의
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          마케팅 목적의 개인정보 수집 및 이용 동의(선택)
                        </p>
                      </div>
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
                    </div>

                    <div className="flex items-center justify-between border-b border-stone-200 py-3">
                      <FieldTitle className="font-bold">문자</FieldTitle>
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

                    <div className="flex items-center justify-between border-b border-stone-200 py-3">
                      <FieldTitle className="font-bold">이메일</FieldTitle>
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
                  </div>
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
                <UtilityPageAside
                  title="알림 안내"
                  description="서비스 운영에 필요한 알림은 마케팅 동의와 별도로 발송됩니다."
                  tone="muted"
                >
                  <div className="space-y-3 text-sm text-zinc-600">
                    <p>서비스 알림은 수신설정과 관계없이 발송됩니다.</p>
                    <Separator />
                    <p>푸시 알림은 앱 내 알림 설정 상태에 따라 발송됩니다.</p>
                    <p className="text-zinc-500">
                      앱 &gt; 마이 &gt; 설정 &gt; 알림설정
                    </p>
                  </div>
                </UtilityPageAside>
              </div>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
