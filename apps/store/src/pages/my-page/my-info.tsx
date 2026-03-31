import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import {
  BellRingIcon,
  CircleCheckIcon,
  MailIcon,
  MapPinnedIcon,
  ShieldAlertIcon,
  UserRoundIcon,
} from "lucide-react";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useProfile } from "@/entities/my-page";
import { usePopup } from "@/shared/hooks/usePopup";
import { useNavigate } from "react-router-dom";
import {
  UtilityLinkList,
  UtilityLinkRow,
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
  UtilityStatList,
} from "@/shared/composite/utility-page";

export default function MyInfoPage() {
  const navigate = useNavigate();
  const { openPopup } = usePopup();
  const { data: profile, isLoading } = useProfile();
  const displayName = isLoading ? "로딩 중..." : profile?.name || "사용자";
  const introMeta = isLoading ? (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
      <span className="inline-flex items-center gap-2">
        <CircleCheckIcon className="size-4" />
        연락처 인증
        <span className="font-medium text-zinc-500">확인 중...</span>
      </span>
      <span className="inline-flex items-center gap-2">
        <BellRingIcon className="size-4" />
        알림 수신
        <span className="font-medium text-zinc-500">확인 중...</span>
      </span>
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
      <span className="inline-flex items-center gap-2">
        <CircleCheckIcon className="size-4 text-emerald-600" />
        연락처 인증
        <span className="font-medium text-zinc-950">
          {profile?.phoneVerified ? "완료" : "확인 필요"}
        </span>
      </span>
      <span className="inline-flex items-center gap-2">
        <BellRingIcon className="size-4 text-zinc-500" />
        알림 수신
        <span className="font-medium text-zinc-950">
          {profile?.notificationEnabled ? "활성" : "비활성"}
        </span>
      </span>
    </div>
  );
  const asideItems = [
    {
      id: "email",
      label: "이메일",
      value: isLoading ? "불러오는 중..." : profile?.email || "-",
    },
    {
      id: "phone",
      label: "휴대폰 번호",
      value: isLoading ? "불러오는 중..." : profile?.phone || "등록되지 않음",
    },
    {
      id: "marketing",
      label: "마케팅 동의",
      value: isLoading
        ? "확인 중..."
        : profile?.marketingConsent.kakaoSms
          ? "동의"
          : "미동의",
    },
  ];

  const identityLinks = [
    {
      label: "회원정보 변경",
      subLabel: "이름, 생년월일, 휴대폰 번호, 이메일을 수정합니다.",
      meta: "기본정보",
      onClick: () => navigate(ROUTES.MY_PAGE_MY_INFO_DETAIL),
    },
    {
      label: "이메일 변경",
      subLabel: "로그인 이메일을 새 주소로 변경합니다.",
      meta: "이메일",
      onClick: () => navigate(ROUTES.MY_PAGE_MY_INFO_EMAIL),
    },
  ];

  const preferenceLinks = [
    {
      label: "배송지 관리",
      subLabel: "기본 배송지와 최근 배송지를 관리합니다.",
      meta: "배송",
      onClick: () => {
        const popup = openPopup(`${ROUTES.SHIPPING}?mode=manage`);
        if (!popup) {
          navigate(`${ROUTES.SHIPPING}?mode=manage`);
        }
      },
    },
    {
      label: "알림 설정",
      subLabel: "주문 알림과 수신 동의 상태를 조정합니다.",
      meta: "알림",
      onClick: () => navigate(ROUTES.MY_PAGE_MY_INFO_NOTICE),
    },
  ];

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Profile Settings"
              title={displayName}
              description="계정 정보, 배송지, 알림 설정을 정리하는 화면입니다. 자주 바꾸는 항목부터 아래 순서대로 배치했습니다."
              meta={introMeta}
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0 space-y-8">
                <UtilityPageSection
                  icon={UserRoundIcon}
                  title="기본 정보"
                  description="로그인과 주문에 직접 연결되는 기본 정보를 관리합니다."
                >
                  <UtilityLinkList>
                    {identityLinks.map((item) => (
                      <UtilityLinkRow
                        key={item.label}
                        label={item.label}
                        description={item.subLabel}
                        meta={item.meta}
                        onClick={item.onClick}
                      />
                    ))}
                  </UtilityLinkList>
                </UtilityPageSection>

                <UtilityPageSection
                  icon={MapPinnedIcon}
                  title="배송 및 알림"
                  description="실제 수령과 상태 안내에 필요한 설정을 관리합니다."
                >
                  <UtilityLinkList>
                    {preferenceLinks.map((item) => (
                      <UtilityLinkRow
                        key={item.label}
                        label={item.label}
                        description={item.subLabel}
                        meta={item.meta}
                        onClick={item.onClick}
                      />
                    ))}
                  </UtilityLinkList>
                </UtilityPageSection>

                <UtilityPageSection
                  icon={ShieldAlertIcon}
                  title="계정 종료"
                  description="회원 탈퇴 전 주문과 환불 진행 상태를 먼저 확인해 주세요."
                  className="pb-1"
                >
                  <UtilityLinkList>
                    <UtilityLinkRow
                      label="탈퇴 절차 진행"
                      description="주의 사항과 안내를 확인한 뒤 탈퇴를 진행합니다."
                      meta="주의"
                      onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO_LEAVE)}
                      className="border-red-200 text-red-700 hover:bg-red-50 focus-visible:ring-red-300 [&_p:first-child]:text-red-700 [&_p:last-child]:text-red-600"
                    />
                  </UtilityLinkList>
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
                <UtilityPageAside
                  icon={MailIcon}
                  title="현재 계정 요약"
                  description="지금 저장된 정보만 빠르게 확인합니다."
                  tone="muted"
                >
                  <UtilityStatList items={asideItems} />
                </UtilityPageAside>
              </div>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
