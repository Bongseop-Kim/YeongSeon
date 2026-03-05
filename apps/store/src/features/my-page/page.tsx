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
import { useSignOut } from "@/features/auth/api/auth-query";
import { useProfile } from "@/features/my-page/api/profile-query";

export default function MypagePage() {
  const navigate = useNavigate();
  const signOutMutation = useSignOut();
  const { data: profile, isLoading } = useProfile();

  const handleSignOut = () => {
    signOutMutation.mutate(undefined, {
      onSuccess: () => navigate(ROUTES.HOME),
    });
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
                {[
                  { label: "주문 내역", route: ROUTES.ORDER_LIST },
                  { label: "취소/반품/교환 내역", route: ROUTES.CLAIM_LIST },
                  { label: "자주 묻는 질문", route: ROUTES.FAQ },
                  { label: "1:1 문의 내역", route: ROUTES.MY_PAGE_INQUIRY },
                  { label: "공지사항", route: ROUTES.NOTICE },
                ].map((item) => (
                  <ListItem
                    key={item.route}
                    label={item.label}
                    onClick={() => navigate(item.route)}
                  />
                ))}
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
