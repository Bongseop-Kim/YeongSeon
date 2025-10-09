import { PwInput } from "@/components/composite/pw-input";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Controller, useForm } from "react-hook-form";

export default function MyInfoLeavePage() {
  const form = useForm<{
    pw: string;
    agree: boolean;
  }>({
    defaultValues: {
      pw: "",
      agree: false,
    },
  });

  return (
    <MainLayout>
      <MainContent className="bg-zinc-100">
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle>비밀번호와 유의사항을 확인해주세요.</CardTitle>
                <PwInput name="pw" />
              </CardHeader>
              <Separator />

              <CardContent className="space-y-4">
                <Label className="font-bold text-base mt-4">유의사항</Label>
                <Label subLabel="사용하고 계신 아이디를 탈퇴하시면 본인과 타인 모두 해당 아이디 재사용 및 복구가 불가합니다.">
                  아이디 재사용 및 복구 불가
                </Label>
                <Label subLabel="데이터가 영구히 삭제되며 복구가 불가합니다. 다만, 모든 스토어 주문 정보는 5년간 분리 보관됩니다.">
                  회원정보/서비스 이용기록 삭제
                </Label>
                <Label subLabel="회원 탈퇴 후 재가입이 불가능합니다.">
                  회원 탈퇴 후 재가입
                </Label>
                <Label subLabel="각종 게시판의 게시글, 댓글, 후기 등의 데이터는 삭제되지 않습니다. 삭제를 원하는 게시물이 있다면 반드시 탈퇴 전 직접 삭제하시기 바랍니다.">
                  등록 게시물 유지
                </Label>

                <Controller
                  name="agree"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="agree"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label subLabel="유의사항을 확인하였으며, 이에 동의합니다." />
                    </div>
                  )}
                />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    다음
                  </Button>
                  <Button className="flex-1">탈퇴 그만두기</Button>
                </div>
              </CardContent>
            </Card>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
