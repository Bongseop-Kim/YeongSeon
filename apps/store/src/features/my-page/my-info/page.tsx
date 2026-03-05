import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/constants/ROUTES";
import { ListItem } from "@/features/my-page/components/list-item";
import { useProfile } from "@/features/my-page/api/profile-query";
import { usePopup } from "@/hooks/usePopup";
import { useNavigate } from "react-router-dom";

export default function MyInfoPage() {
  const navigate = useNavigate();
  const { openPopup } = usePopup();
  const { data: profile, isLoading } = useProfile();

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <Card>
            <CardHeader>
              <CardTitle>
                {isLoading ? "로딩 중..." : profile?.name || "사용자"}
              </CardTitle>
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
                    const popup = openPopup(`${ROUTES.SHIPPING}?mode=manage`);
                    if (!popup) {
                      navigate(`${ROUTES.SHIPPING}?mode=manage`);
                    }
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
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
