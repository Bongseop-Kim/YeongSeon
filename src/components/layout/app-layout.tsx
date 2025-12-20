import { useLocation, useNavigate } from "react-router-dom";
import Router from "@/routes";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ShoppingBagIcon } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/constants/NAVIGATION_ITEMS";
import {
  Header,
  HeaderActions,
  HeaderContent,
  HeaderNav,
  HeaderTitle,
} from "@/components/composite/header";
import NavLink from "@/components/ui/nav-link";
import { SearchBar } from "@/components/composite/search-bar";
import SearchSheet from "@/components/composite/search-sheet";
import { ROUTE_TITLES } from "@/constants/ROUTE_TITLES";
import { ROUTES } from "@/constants/ROUTES";
import MenuSheet from "../composite/menu-sheet";
import { useSearchStore } from "@/store/search";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useSignOut } from "@/features/auth/api/auth.query";
import { Badge } from "@/components/ui/badge";
import {
  Footer,
  FooterContent,
  FooterLink,
  FooterSection,
  FooterTitle,
} from "@/features/home/components/footer";
import { useState } from "react";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [_, setPopup] = useState<Window | null>(null);
  const hideHeaderPaths = [
    ROUTES.SHIPPING,
    ROUTES.PRIVACY_POLICY,
    ROUTES.TERMS_OF_SERVICE,
    ROUTES.REFUND_POLICY,
  ];
  const showHeader = !hideHeaderPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  const { isMobile } = useBreakpoint();
  const { config } = useSearchStore();
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const cartItemCount = getTotalItems();
  const { user } = useAuthStore();
  const signOutMutation = useSignOut();

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const openPopup = (url: string) => {
    const popup = window.open(
      url,
      "popup",
      "width=430,height=650,left=200,top=100,scrollbars=yes,resizable=no"
    );
    setPopup(popup);
  };

  const getCurrentPageName = () => {
    // 데스크톱에서는 항상 ESSE SION 표시
    if (!isMobile) {
      return "ESSE SION";
    }

    const { pathname } = location;

    // 정확한 매칭 먼저 시도
    if (ROUTE_TITLES[pathname as keyof typeof ROUTE_TITLES]) {
      return ROUTE_TITLES[pathname as keyof typeof ROUTE_TITLES];
    }

    // ROUTE_TITLES에서 가장 긴 매칭 경로 찾기
    let matchedPath = "";
    let matchedTitle = "";

    // ROUTE_TITLES의 모든 키를 확인하여 가장 긴 매칭 찾기
    for (const [route, title] of Object.entries(ROUTE_TITLES)) {
      if (pathname.startsWith(route) && route.length > matchedPath.length) {
        // 슬래시로 끝나는 경로가 아니거나, 정확히 일치하거나, 다음 문자가 슬래시인 경우만 매칭
        if (
          route === "/" ||
          pathname === route ||
          pathname.startsWith(route + "/")
        ) {
          matchedPath = route;
          matchedTitle = title;
        }
      }
    }

    if (matchedTitle) {
      return matchedTitle;
    }

    return "ESSE SION";
  };

  const canGoBack = () => {
    return window.history.length > 1 && location.pathname !== ROUTES.HOME;
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <>
      {showHeader && (
        <Header size="sm">
          <HeaderContent>
            <HeaderTitle
              className={`flex items-center ${isMobile ? "gap-2" : "gap-4"}`}
            >
              {/* 모바일에서 뒤로가기 버튼 */}
              {canGoBack() && isMobile && (
                <button
                  onClick={handleBackClick}
                  className="transition-colors duration-200 p-1 -ml-2"
                >
                  <ChevronLeft className="w-5 h-5 text-zinc-50" />
                  <span className="sr-only">뒤로가기</span>
                </button>
              )}
              <span className="text-zinc-50">{getCurrentPageName()}</span>
            </HeaderTitle>

            {/* 데스크톱 네비게이션 */}
            {!isMobile && (
              <HeaderNav>
                {NAVIGATION_ITEMS.map((item) => (
                  <NavLink key={item.href} to={item.href}>
                    {item.label}
                  </NavLink>
                ))}
              </HeaderNav>
            )}

            <HeaderActions className="space-x-1">
              {isMobile && (
                <NavLink
                  to={ROUTES.CART}
                  className={`relative ${cartItemCount > 0 ? "mr-2" : ""}`}
                >
                  <ShoppingBagIcon className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center bg-blue-600">
                      {cartItemCount}
                    </Badge>
                  )}
                </NavLink>
              )}
              <MenuSheet />
              {!isMobile && (
                <div className="flex items-center">
                  <NavLink to={ROUTES.MY_PAGE}>마이</NavLink>
                  <NavLink
                    to={ROUTES.CART}
                    className={`relative ${
                      cartItemCount > 0 ? "pr-6 mr-2" : "pr-2 mr-2"
                    }`}
                  >
                    장바구니
                    {cartItemCount > 0 && (
                      <Badge className="absolute -top-1 right-0 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center bg-blue-600">
                        {cartItemCount}
                      </Badge>
                    )}
                  </NavLink>
                  {user ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSignOut}
                      disabled={signOutMutation.isPending}
                    >
                      <span>로그아웃</span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(ROUTES.LOGIN)}
                    >
                      <span>로그인</span>
                    </Button>
                  )}
                </div>
              )}
            </HeaderActions>
          </HeaderContent>
          {config.enabled && (
            <div
              className={`bg-zinc-900 pb-4 mx-auto ${
                isMobile ? "px-4" : "px-8"
              } max-w-7xl flex`}
            >
              <SearchBar />

              <SearchSheet />
            </div>
          )}
        </Header>
      )}

      <div className={config.enabled ? "pt-12" : "pt-0"}>
        <Router />
      </div>
      {/* 모바일에서는 홈 페이지에서만 footer 표시 */}
      {(!isMobile || location.pathname === ROUTES.HOME) && (
        <Footer>
          <FooterContent className={isMobile ? "" : "mb-20"}>
            {!isMobile && (
              <div className="grid grid-cols-3 gap-8">
                <FooterSection>
                  <FooterTitle>서비스</FooterTitle>
                  {NAVIGATION_ITEMS.map((item) => (
                    <FooterLink key={item.href} href={item.href}>
                      {item.label}
                    </FooterLink>
                  ))}
                </FooterSection>
                <FooterSection>
                  <FooterTitle>고객지원</FooterTitle>
                  <FooterLink href={ROUTES.FAQ}>자주 묻는 질문</FooterLink>
                  <FooterLink href={ROUTES.MY_PAGE_INQUIRY}>
                    문의하기
                  </FooterLink>
                  <FooterLink href={ROUTES.NOTICE}>공지사항</FooterLink>
                </FooterSection>
                {/* <FooterSection>
                <FooterTitle>회사소개</FooterTitle>
                <FooterLink href="/about">회사 소개</FooterLink>
                <FooterLink href="/history">연혁</FooterLink>
                <FooterLink href="/location">찾아오시는 길</FooterLink>
              </FooterSection> */}
                <FooterSection>
                  <FooterTitle>정책</FooterTitle>
                  <FooterLink
                    href={ROUTES.PRIVACY_POLICY}
                    onClick={(e) => {
                      e.preventDefault();
                      openPopup(ROUTES.PRIVACY_POLICY);
                    }}
                  >
                    개인정보처리방침
                  </FooterLink>
                  <FooterLink
                    href={ROUTES.TERMS_OF_SERVICE}
                    onClick={(e) => {
                      e.preventDefault();
                      openPopup(ROUTES.TERMS_OF_SERVICE);
                    }}
                  >
                    이용약관
                  </FooterLink>
                  <FooterLink
                    href={ROUTES.REFUND_POLICY}
                    onClick={(e) => {
                      e.preventDefault();
                      openPopup(ROUTES.REFUND_POLICY);
                    }}
                  >
                    환불정책
                  </FooterLink>
                </FooterSection>
              </div>
            )}
            {isMobile ? (
              // 모바일: 간소화된 레이아웃 (섹션 없음, border 없음)
              <div>
                <div className="text-xs text-gray-500 text-center leading-relaxed">
                  <div className="mb-1">
                    영선산업 | 대표: 김영선 | 사업자등록번호: 305-26-32033
                  </div>
                  <div>대전 동구 가양2동 408-7</div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  © 2024 ESSE SION. All rights reserved.
                </p>
              </div>
            ) : (
              // 데스크톱: 기존 레이아웃 유지
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="space-y-4">
                  <div className="text-xs text-gray-500 text-center space-y-1">
                    <div>영선산업 | 대표: 김영선</div>
                    <div>주소: 대전 동구 가양2동 408-7</div>
                    <div>
                      호스팅사업자: 영선산업 | 사업자등록번호: 305-26-32033
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    © 2024 ESSE SION. All rights reserved.
                  </p>
                </div>
              </div>
            )}
          </FooterContent>
        </Footer>
      )}
    </>
  );
}
