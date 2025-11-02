import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller, useForm } from "react-hook-form";

export default function MyInfoEmailPage() {
  const form = useForm<{ email: string; emailCode: string }>({
    defaultValues: {
      email: "",
      emailCode: "",
    },
  });

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader />
              <CardContent className="space-y-4">
                <Label className="mb-1">이메일</Label>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full"
                      />
                      <Button
                        variant="outline"
                        className="w-24"
                        disabled={
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)
                        }
                      >
                        인증요청
                      </Button>
                    </div>
                  )}
                />

                <Label className="mb-1">인증번호</Label>
                <Controller
                  name="emailCode"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full"
                    />
                  )}
                />

                <Button className="w-full" disabled={!form.watch("emailCode")}>
                  완료
                </Button>
              </CardContent>
            </Card>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
