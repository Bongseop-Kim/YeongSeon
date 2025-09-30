import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Controller, useForm } from "react-hook-form";

export default function MyInfoNoticePage() {
  const form = useForm<{
    isMarketingConsent: boolean;
    isSmsConsent: boolean;
    isEmailConsent: boolean;
  }>({
    defaultValues: {
      isMarketingConsent: false,
      isSmsConsent: false,
      isEmailConsent: false,
    },
  });

  return (
    <MainLayout>
      <MainContent className="bg-stone-100">
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
                      onCheckedChange={field.onChange}
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
                        onCheckedChange={field.onChange}
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
                        onCheckedChange={field.onChange}
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
