import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Router from "@/routes";
import { Button } from "@/components/ui-extended/button";
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

const HEADER_SCROLL_THRESHOLD = 24;
const HEADER_BTN_CLASS =
  "border-white/18 bg-white/10 text-white hover:bg-white hover:text-black";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
  const isHomePage = location.pathname === ROUTES.HOME;
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

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

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || !showHeader || !isHomePage) {
      setIsHeaderScrolled(false);
      return;
    }

    const updateScrolledState = () => {
      setIsHeaderScrolled(scrollContainer.scrollTop > HEADER_SCROLL_THRESHOLD);
    };

    updateScrolledState();
    scrollContainer.addEventListener("scroll", updateScrolledState, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener("scroll", updateScrolledState);
    };
  }, [isHomePage, showHeader]);

  const isOverlayHeader = showHeader && isHomePage;
  const headerTone = isOverlayHeader && !isHeaderScrolled ? "overlay" : "solid";
  const headerClassName = isOverlayHeader
    ? "absolute inset-x-0 top-0 z-50 h-auto"
    : "relative z-30 h-auto";

  return (
    <div className="relative flex h-dvh flex-col overflow-x-hidden">
      {showHeader && (
        <Header
          size="sm"
          sticky={false}
          tone={headerTone}
          className={headerClassName}
        >
          <HeaderContent
            className={
              isOverlayHeader && !isHeaderScrolled
                ? "min-h-16 lg:min-h-[4.5rem]"
                : "min-h-14"
            }
          >
            <HeaderTitle
              className={`flex items-center ${
                isMobile ? "gap-2 text-base" : "gap-4 text-[1.05rem]"
              }`}
            >
              {/* 모바일에서 뒤로가기 버튼 */}
              {canGoBack() && isMobile && (
                <button
                  onClick={handleBackClick}
                  className="transition-colors duration-200 p-1 -ml-2"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                  <span className="sr-only">뒤로가기</span>
                </button>
              )}
              <button
                type="button"
                className={`border-0 bg-transparent p-0 font-inherit tracking-[0.18em] text-white transition-opacity duration-300 disabled:cursor-default disabled:opacity-100 ${
                  isMobile ? "text-[0.98rem]" : "text-[1.02rem]"
                }`}
                onClick={() => !isMobile && navigate(ROUTES.HOME)}
                disabled={isMobile}
                aria-disabled={isMobile}
              >
                {getCurrentPageName()}
              </button>
            </HeaderTitle>

            {/* 데스크톱 네비게이션 */}
            {!isMobile && (
              <HeaderNav className="space-x-4 xl:space-x-6">
                {NAVIGATION_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={
                      (
                        item.href !== ROUTES.HOME
                          ? location.pathname.startsWith(item.href)
                          : location.pathname === item.href
                      )
                        ? "text-white"
                        : "text-white/58"
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </HeaderNav>
            )}

            <HeaderActions
              className={isMobile ? "space-x-1" : "space-x-2 lg:space-x-3"}
            >
              {isMobile && (
                <NavLink
                  to={ROUTES.CART}
                  className="relative mr-1 rounded-full px-2.5 py-2 text-white/82"
                >
                  <ShoppingBagIcon className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-transparent bg-brand-accent px-1.5 text-xs text-brand-surface-strong">
                      {cartItemCount}
                    </Badge>
                  )}
                </NavLink>
              )}
              <MenuSheet />
              {!isMobile && (
                <div className="flex items-center">
                  <NavLink to={ROUTES.MY_PAGE} className="text-white/58">
                    마이
                  </NavLink>
                  <NavLink
                    to={ROUTES.CART}
                    className="relative mr-2 pr-6 text-white/82"
                  >
                    장바구니
                    {cartItemCount > 0 && (
                      <Badge className="absolute -top-1 right-0 flex h-5 min-w-5 items-center justify-center rounded-full border-transparent bg-brand-accent px-1.5 text-xs text-brand-surface-strong">
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
                      className={HEADER_BTN_CLASS}
                    >
                      <span>로그아웃</span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(ROUTES.LOGIN)}
                      className={HEADER_BTN_CLASS}
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
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
                  <div className="text-center text-xs leading-relaxed text-foreground-muted">
                    <div className="mb-1">
                      영선산업 | 대표: 김영선 | 사업자등록번호: 305-26-32033
                    </div>
                    <div>통신판매업 번호: 2017-대전동구-0353</div>
                    <div>전화번호: 042-626-9055</div>
                    <div>대전 동구 가양2동 408-7</div>
                  </div>
                  <p className="text-center text-xs text-foreground-muted">
                    © 2026 ESSE SION. All rights reserved.
                  </p>
                </div>
              ) : (
                // 데스크톱: 기존 레이아웃 유지
                <div className="mt-12 border-t border-border pt-8">
                  <div className="space-y-4">
                    <div className="space-y-1 text-center text-xs text-foreground-muted">
                      <div>영선산업 | 대표: 김영선</div>
                      <div>주소: 대전 동구 가양2동 408-7</div>
                      <div>통신판매업 번호: 2017-대전동구-0353</div>
                      <div>전화번호: 042-626-9055</div>
                      <div>
                        호스팅사업자: 영선산업 | 사업자등록번호: 305-26-32033
                      </div>
                    </div>
                    <p className="text-center text-xs text-foreground-muted">
                      © 2026 ESSE SION. All rights reserved.
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
