import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ListItem } from "@/features/my-page/components/list-item";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MyInfoPage() {
  const navigate = useNavigate();
  const [_, setPopup] = useState<Window | null>(null);

  const openPopup = () => {
    const popup = window.open(
      "/shipping",
      "popup",
      "width=430,height=650,left=200,top=100,scrollbars=yes,resizable=no"
    );
    setPopup(popup);
  };

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
                    onClick={() => {
                      navigate("/my-page/my-info/detail");
                    }}
                  />
                  <ListItem
                    label="배송지 관리"
                    onClick={() => {
                      openPopup();
                    }}
                  />
                  <ListItem
                    label="알림 설정"
                    onClick={() => {
                      navigate("/my-page/my-info/notice");
                    }}
                  />
                  <ListItem
                    label="회원탈퇴"
                    onClick={() => {
                      navigate("/my-page/my-info/leave");
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
