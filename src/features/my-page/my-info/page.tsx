import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/constants/ROUTES";
import { ListItem } from "@/features/my-page/components/list-item";
import { usePopup } from "@/hooks/usePopup";
import { useNavigate } from "react-router-dom";

export default function MyInfoPage() {
  const navigate = useNavigate();
  const { openPopup } = usePopup();

  return (
    <MainLayout>
      <MainContent>
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
                      navigate(ROUTES.MY_PAGE_MY_INFO_DETAIL);
                    }}
                  />
                  <ListItem
                    label="배송지 관리"
                    onClick={() => {
                      openPopup(`${ROUTES.SHIPPING}?mode=manage`);
                    }}
                  />
                  <ListItem
                    label="알림 설정"
                    onClick={() => {
                      navigate(ROUTES.MY_PAGE_MY_INFO_NOTICE);
                    }}
                  />
                  <ListItem
                    label="회원탈퇴"
                    onClick={() => {
                      navigate(ROUTES.MY_PAGE_MY_INFO_LEAVE);
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
