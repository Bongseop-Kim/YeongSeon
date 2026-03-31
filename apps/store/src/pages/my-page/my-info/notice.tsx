import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "@/shared/lib/toast";
import { useProfile, useUpdateMarketingConsent } from "@/entities/my-page";
import { Empty } from "@/shared/composite/empty";
import {
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Separator } from "@/shared/ui/separator";
import { Switch } from "@/shared/ui/switch";

interface NoticeFormValues {
  kakaoSms: boolean;
}

export default function MyInfoNoticePage() {
  const { data: profile, isLoading, isError, error } = useProfile();
  const updateMarketingConsentMutation = useUpdateMarketingConsent();

  const form = useForm<NoticeFormValues>({
    defaultValues: { kakaoSms: false },
  });
  const isSaving = updateMarketingConsentMutation.isPending;

  useEffect(() => {
    form.reset({
      kakaoSms: profile?.marketingConsent.kakaoSms ?? false,
    });
  }, [form, profile]);

  const handleToggle = async (checked: boolean) => {
    const previous = form.getValues();
    form.setValue("kakaoSms", checked);

    try {
      await updateMarketingConsentMutation.mutateAsync({ kakaoSms: checked });
    } catch {
      form.setValue("kakaoSms", previous.kakaoSms);
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
              description="혜택, 이벤트, 프로모션 알림에 대한 수신 동의를 관리합니다."
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0">
                <UtilityPageSection
                  title="수신 채널 설정"
                  description="카카오톡 마케팅 알림 수신 여부를 설정합니다. 카카오톡 발송 실패 시 문자로 대체됩니다."
                >
                  <div className="flex items-center justify-between border-b border-stone-200 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-950">
                        카카오톡/문자
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        마케팅 목적의 개인정보 수집 및 이용 동의 (선택)
                      </p>
                    </div>
                    <Controller
                      name="kakaoSms"
                      control={form.control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            void handleToggle(checked);
                          }}
                          disabled={isSaving}
                        />
                      )}
                    />
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
                    <p>
                      서비스 알림 수신 설정은 회원정보 변경 페이지에서
                      관리합니다.
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
