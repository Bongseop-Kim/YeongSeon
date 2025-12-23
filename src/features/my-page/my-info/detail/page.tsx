import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { useProfile } from "../../api/profile-query";

export default function MyInfoDetailPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader />
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-4">로딩 중...</div>
                ) : profile ? (
                  <>
                    <Item label="이름" value={profile.name || "-"} />
                    <Item label="생년월일" value={profile.birth || "-"} />
                    <Item label="휴대폰번호" value={profile.phone || "-"} />
                    <Item label="이메일" value={profile.email || "-"} />
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
          }
        />
      </MainContent>
    </MainLayout>
  );
}

const Item = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex gap-2">
      <Label className="w-20 font-bold">{label}</Label>
      <Label>{value}</Label>
    </div>
  );
};
