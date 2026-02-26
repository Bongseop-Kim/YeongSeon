import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRightIcon } from "lucide-react";
import { ListItem } from "./components/list-item";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AdPanel } from "@/components/composite/ad-panel";
import { ROUTES } from "@/constants/ROUTES";
import { useSignOut } from "@/features/auth/api/auth.query";
import { useProfile } from "./api/profile-query";

export default function MypagePage() {
  const navigate = useNavigate();
  const signOutMutation = useSignOut();
  const { data: profile, isLoading } = useProfile();

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
            <Card>
              <div className="p-2">
                <AdPanel />
              </div>
              <CardHeader>
                <CardTitle>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO)}
                    aria-label="내 정보로 이동"
                  >
                    {isLoading ? "로딩 중..." : profile?.name || "사용자"}{" "}
                    <ChevronRightIcon className="size-4" aria-hidden="true" />
                  </button>
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="space-y-2">
                <div>
                  <ListItem
                    label="주문 내역"
                    onClick={() => {
                      navigate(ROUTES.ORDER_LIST);
                    }}
                  />
                  <ListItem
                    label="취소/반품/교환 내역"
                    onClick={() => {
                      navigate(ROUTES.CLAIM_LIST);
                    }}
                  />
                  <ListItem
                    label="자주 묻는 질문"
                    onClick={() => {
                      navigate(ROUTES.FAQ);
                    }}
                  />
                  <ListItem
                    label="1:1 문의 내역"
                    onClick={() => {
                      navigate(ROUTES.MY_PAGE_INQUIRY);
                    }}
                  />
                  <ListItem
                    label="공지사항"
                    onClick={() => {
                      navigate(ROUTES.NOTICE);
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    disabled={signOutMutation.isPending}
                  >
                    로그아웃
                  </Button>
                </div>
              </CardContent>
            </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
