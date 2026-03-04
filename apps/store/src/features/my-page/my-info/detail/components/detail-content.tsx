import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { useProfile } from "@/features/my-page/api/profile-query";
import { ProfileItem } from "./profile-item";

export function DetailContent() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <Card>
            <CardHeader />
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">로딩 중...</div>
              ) : profile ? (
                <>
                  <ProfileItem label="이름" value={profile.name || "-"} />
                  <ProfileItem label="생년월일" value={profile.birth || "-"} />
                  <ProfileItem label="휴대폰번호" value={profile.phone || "-"} />
                  <ProfileItem label="이메일" value={profile.email || "-"} />
                </>
              ) : (
                <div className="text-center py-4 text-red-500">
                  프로필을 불러올 수 없습니다.
                </div>
              )}
            </CardContent>

            <div className="flex gap-2 mt-4 px-4">
              <Button variant="outline" className="flex-1">
                회원정보 변경
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigate(ROUTES.MY_PAGE_MY_INFO_EMAIL);
                }}
              >
                이메일 변경
              </Button>
            </div>
          </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
