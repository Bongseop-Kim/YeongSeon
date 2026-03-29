import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import {
  BellRingIcon,
  ChevronRightIcon,
  HeadphonesIcon,
  Package2Icon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdPanel } from "@/shared/composite/ad-panel";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useSignOut } from "@/entities/auth";
import { useProfile, profileKeys } from "@/entities/my-page";
import { useQueryClient } from "@tanstack/react-query";
import {
  UtilityLinkList,
  UtilityLinkRow,
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
  UtilityStatList,
} from "@/shared/composite/utility-page";

const ORDER_LINKS = [
  {
    label: "주문 내역",
    subLabel: "결제 이후 진행 상태와 배송 흐름을 확인합니다.",
    meta: "주문",
    route: ROUTES.ORDER_LIST,
  },
  {
    label: "견적 요청 내역",
    subLabel: "주문 제작 상담과 견적 응답을 모아봅니다.",
    meta: "견적",
    route: ROUTES.MY_PAGE_QUOTE_REQUEST,
  },
  {
    label: "취소/반품/교환 내역",
    subLabel: "클레임 진행 상태와 처리 결과를 확인합니다.",
    meta: "클레임",
    route: ROUTES.CLAIM_LIST,
  },
  {
    label: "토큰 내역",
    subLabel: "구매 및 환불에 따른 토큰 변동을 확인합니다.",
    meta: "토큰",
    route: ROUTES.MY_PAGE_TOKEN_HISTORY,
  },
];

const SUPPORT_LINKS = [
  {
    label: "1:1 문의 내역",
    subLabel: "등록한 문의와 답변 상태를 확인합니다.",
    meta: "문의",
    route: ROUTES.MY_PAGE_INQUIRY,
  },
  {
    label: "자주 묻는 질문",
    subLabel: "배송, 주문, 환불 관련 기본 답변을 빠르게 찾습니다.",
    meta: "FAQ",
    route: ROUTES.FAQ,
  },
  {
    label: "공지사항",
    subLabel: "서비스 운영 변경과 중요 안내를 확인합니다.",
    meta: "공지",
    route: ROUTES.NOTICE,
  },
];

export default function MypagePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOutMutation = useSignOut();
  const { data: profile, isLoading } = useProfile();

  const displayName = isLoading ? "로딩 중..." : profile?.name || "사용자";
  const profileSummary = [
    profile?.email,
    profile?.phone || "휴대폰 번호 미등록",
  ]
    .filter(Boolean)
    .join(" · ");

  const accountSignals = [
    {
      label: "연락처 인증",
      value: profile?.phoneVerified ? "완료" : "확인 필요",
    },
    {
      label: "알림 수신",
      value: profile?.notificationEnabled ? "활성" : "비활성",
    },
    {
      label: "마케팅 동의",
      value: profile?.marketingConsent.all ? "동의" : "미동의",
    },
  ];

  const handleSignOut = () => {
    signOutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: profileKeys.all });
        navigate(ROUTES.HOME);
      },
    });
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="My Account"
              title={displayName}
              description={profileSummary}
              actions={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-stone-400 hover:text-zinc-950"
                  onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO)}
                  aria-label="내 정보로 이동"
                >
                  계정 관리
                  <ChevronRightIcon className="size-4" aria-hidden="true" />
                </button>
              }
              meta={
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600">
                  {accountSignals.map((item) => (
                    <span key={item.label}>
                      <span className="text-zinc-500">{item.label}</span>
                      <span className="mx-2 text-stone-300">/</span>
                      <span className="font-medium text-zinc-950">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              }
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.78fr)] lg:gap-12">
              <div className="min-w-0 space-y-8">
                <UtilityPageSection
                  icon={Package2Icon}
                  title="주문과 내역"
                  description="주문 진행, 견적 응답, 클레임과 토큰 변동을 한곳에서 확인합니다."
                >
                  <UtilityLinkList>
                    {ORDER_LINKS.map((item) => (
                      <UtilityLinkRow
                        key={item.route}
                        label={item.label}
                        description={item.subLabel}
                        meta={item.meta}
                        onClick={() => navigate(item.route)}
                      />
                    ))}
                  </UtilityLinkList>
                </UtilityPageSection>

                <UtilityPageSection
                  icon={HeadphonesIcon}
                  title="고객지원"
                  description="문의 응답, 운영 공지, 자주 묻는 질문을 빠르게 찾을 수 있습니다."
                >
                  <UtilityLinkList>
                    {SUPPORT_LINKS.map((item) => (
                      <UtilityLinkRow
                        key={item.route}
                        label={item.label}
                        description={item.subLabel}
                        meta={item.meta}
                        onClick={() => navigate(item.route)}
                      />
                    ))}
                  </UtilityLinkList>
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
                <UtilityPageAside
                  icon={ShieldCheckIcon}
                  title="현재 상태"
                  description="지금 계정에서 확인할 설정 상태입니다."
                  tone="muted"
                >
                  <UtilityStatList items={accountSignals} />
                </UtilityPageAside>

                <UtilityPageAside
                  icon={WalletCardsIcon}
                  title="프로모션"
                  description="현재 진행 중인 혜택과 이벤트를 확인합니다."
                  tone="muted"
                >
                  <AdPanel />
                </UtilityPageAside>
              </div>
            </div>

            <UtilityPageSection
              icon={BellRingIcon}
              title="설정"
              description="자주 수정하는 계정 관련 설정으로 바로 이동합니다."
            >
              <UtilityLinkList>
                <UtilityLinkRow
                  label="내 정보"
                  description="이름, 이메일, 휴대폰 번호와 기본 정보를 관리합니다."
                  meta="계정"
                  onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO)}
                />
                <UtilityLinkRow
                  label="알림 설정"
                  description="주문 상태 알림과 수신 동의를 확인합니다."
                  meta="설정"
                  onClick={() => navigate(ROUTES.MY_PAGE_MY_INFO_NOTICE)}
                />
                <UtilityLinkRow
                  label="로그아웃"
                  description="현재 기기에서 로그아웃하고 홈으로 돌아갑니다."
                  meta="동작"
                  onClick={handleSignOut}
                  className="text-red-700 hover:bg-red-50 focus-visible:ring-red-300 [&_p:first-child]:text-red-700"
                />
              </UtilityLinkList>
            </UtilityPageSection>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
