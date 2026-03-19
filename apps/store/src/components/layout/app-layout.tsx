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
import SearchSection from "@/components/composite/search-section";
import { ROUTE_TITLES } from "@/constants/ROUTE_TITLES";
import { ROUTES } from "@/constants/ROUTES";
import MenuSheet from "@/components/composite/menu-sheet";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useCart } from "@/features/cart/hooks/useCart";
import { useAuthStore } from "@/store/auth";
import { useSignOut } from "@/features/auth/api/auth-query";
import { Badge } from "@/components/ui/badge";
import {
  Footer,
  FooterContent,
  FooterLink,
  FooterSection,
  FooterTitle,
} from "@/components/layout/footer";
import { usePopup } from "@/hooks/usePopup";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideHeaderPaths = [
    ROUTES.SHIPPING,
    ROUTES.PRIVACY_POLICY,
    ROUTES.TERMS_OF_SERVICE,
    ROUTES.REFUND_POLICY,
  ];
  const showHeader = !hideHeaderPaths.some((path) =>
    location.pathname.startsWith(path),
  );
  const { isMobile } = useBreakpoint();
  const { totalItems: cartItemCount } = useCart();
  const { user } = useAuthStore();
  const signOutMutation = useSignOut();
  const { openPopup } = usePopup();

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error("Sign out error:", error);
    }
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
    <div className="flex flex-col h-dvh overflow-x-hidden">
      {showHeader && (
        <Header size="sm" sticky={false} className="h-auto">
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
                <NavLink to={ROUTES.CART} className={`relative pr-3 mr-2`}>
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
                  <NavLink to={ROUTES.CART} className={`relative pr-6 mr-2`}>
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
          <SearchSection />
        </Header>
      )}

      <div className="flex-1 overflow-y-auto">
        <Router />
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
                    <div>통신판매업 번호: 2017-대전동구-0353</div>
                    <div>전화번호: 042-626-9055</div>
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
                      <div>통신판매업 번호: 2017-대전동구-0353</div>
                      <div>전화번호: 042-626-9055</div>
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
      </div>
    </div>
  );
}
