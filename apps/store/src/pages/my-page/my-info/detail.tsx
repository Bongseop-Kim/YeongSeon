import { useNavigate } from "react-router-dom";
import { UserRoundIcon } from "lucide-react";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Button } from "@/shared/ui-extended/button";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useProfile } from "@/entities/my-page";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";

export default function MyInfoDetailPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Profile Detail"
              title="회원정보 변경"
              description="현재 계정에 저장된 기본 정보를 확인하고 관리합니다."
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0">
                <UtilityPageSection
                  icon={UserRoundIcon}
                  title="기본 정보"
                  description="주문과 알림에 사용되는 현재 저장 정보를 보여줍니다."
                >
                  {isLoading ? (
                    <div
                      className="py-8 text-sm text-zinc-500"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      프로필 정보를 불러오는 중입니다.
                    </div>
                  ) : profile ? (
                    <dl>
                      <UtilityKeyValueRow
                        label="이름"
                        value={profile.name || "-"}
                      />
                      <UtilityKeyValueRow
                        label="생년월일"
                        value={profile.birth || "-"}
                      />
                      <UtilityKeyValueRow
                        label="휴대폰 번호"
                        value={profile.phone || "-"}
                      />
                      <UtilityKeyValueRow
                        label="이메일"
                        value={profile.email || "-"}
                      />
                    </dl>
                  ) : (
                    <div
                      className="py-8 text-sm text-red-500"
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                    >
                      프로필을 불러올 수 없습니다.
                    </div>
                  )}
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
                <UtilityPageAside
                  title="다음 작업"
                  description="자주 사용하는 정보 변경 경로입니다."
                  tone="muted"
                >
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      disabled
                      aria-disabled="true"
                      title="준비 중인 기능입니다."
                    >
                      회원정보 변경 준비 중
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO_NOTICE)}
                      disabled={isLoading || !profile}
                    >
                      알림 설정
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO_EMAIL)}
                      disabled={isLoading || !profile}
                    >
                      이메일 변경
                    </Button>
                  </div>
                </UtilityPageAside>
              </div>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
