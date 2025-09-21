import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListItem } from "../components/list-item";
import { Separator } from "@/components/ui/separator";

export default function MyInfoPage() {
  return (
    <MainLayout>
      <MainContent className="bg-stone-100">
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader>
                <CardTitle>김봉섭</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="space-y-2">
                <div>
                  <ListItem
                    label="회원정보 변경"
                    subLabel="이름, 생년월일, 휴대폰번호, 이메일"
                    onClick={() => {}}
                  />
                  <ListItem label="배송지 관리" onClick={() => {}} />
                  <ListItem label="간편 로그인 설정" onClick={() => {}} />
                  <ListItem label="알림 설정" onClick={() => {}} />
                  <ListItem label="회원탈퇴" onClick={() => {}} />
                </div>
              </CardContent>
            </Card>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
