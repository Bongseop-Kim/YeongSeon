import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Router from "@/app/router";
import { Button } from "@/shared/ui-extended/button";
import { ChevronLeft, ShoppingBagIcon } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/shared/constants/NAVIGATION_ITEMS";
import {
  Header,
  HeaderActions,
  HeaderContent,
  HeaderNav,
  HeaderTitle,
} from "@/shared/composite/header";
import NavLink from "@/shared/ui/nav-link";
import { ROUTE_TITLES } from "@/shared/constants/ROUTE_TITLES";
import { ROUTES } from "@/shared/constants/ROUTES";
import MenuSheet from "@/app/layout/menu-sheet";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { useCart } from "@/features/cart";
import { useAuthStore } from "@/shared/store/auth";
import { useSignOut } from "@/entities/auth";
import { Badge } from "@/shared/ui/badge";
import {
  Footer,
  FooterContent,
  FooterLink,
  FooterSection,
  FooterTitle,
} from "@/shared/layout/footer";
import { usePopup } from "@/shared/hooks/usePopup";

const HEADER_SCROLL_THRESHOLD = 24;
const HEADER_BTN_CLASS =
  "border-white/18 bg-white/10 text-white hover:bg-white hover:text-black";

function isActiveNavItem(pathname: string, href: string) {
  return href === ROUTES.HOME ? pathname === href : pathname.startsWith(href);
}

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
  const shouldHideFooter = showHeader && !isHomePage && isMobile;

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getCurrentPageName = () => {
    if (!isMobile) {
      return "ESSE SION";
    }

    const { pathname } = location;

    if (ROUTE_TITLES[pathname as keyof typeof ROUTE_TITLES]) {
      return ROUTE_TITLES[pathname as keyof typeof ROUTE_TITLES];
    }

    let matchedPath = "";
    let matchedTitle = "";

    for (const [route, title] of Object.entries(ROUTE_TITLES)) {
      if (pathname.startsWith(route) && route.length > matchedPath.length) {
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
    <div className="relative flex h-dvh flex-col overflow-x-auto">
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

            {!isMobile && (
              <HeaderNav className="space-x-4 xl:space-x-6">
                {NAVIGATION_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={
                      isActiveNavItem(location.pathname, item.href)
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
        </Header>
      )}

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <Router />

        {showHeader ? (
          <Footer
            className={shouldHideFooter ? "hidden lg:block" : undefined}
            data-hidden={shouldHideFooter ? "true" : "false"}
            data-mobile={isMobile ? "true" : "false"}
          >
            <FooterContent>
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <FooterSection>
                  <FooterTitle>서비스</FooterTitle>
                  <FooterLink href={ROUTES.HOME}>홈</FooterLink>
                  <FooterLink href={ROUTES.SHOP}>스토어</FooterLink>
                  <FooterLink href={ROUTES.REFORM}>수선</FooterLink>
                  <FooterLink href={ROUTES.DESIGN}>디자인</FooterLink>
                  <FooterLink href={ROUTES.CUSTOM_ORDER}>주문 제작</FooterLink>
                  <FooterLink href={ROUTES.SAMPLE_ORDER}>샘플 제작</FooterLink>
                </FooterSection>
                <FooterSection>
                  <FooterTitle>고객지원</FooterTitle>
                  <FooterLink href={ROUTES.FAQ}>자주 묻는 질문</FooterLink>
                  <FooterLink href={ROUTES.MY_PAGE_INQUIRY}>
                    문의하기
                  </FooterLink>
                  <FooterLink href={ROUTES.NOTICE}>공지사항</FooterLink>
                </FooterSection>
                <FooterSection>
                  <FooterTitle>정책</FooterTitle>
                  <FooterLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openPopup(ROUTES.PRIVACY_POLICY);
                    }}
                  >
                    개인정보처리방침
                  </FooterLink>
                  <FooterLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openPopup(ROUTES.TERMS_OF_SERVICE);
                    }}
                  >
                    이용약관
                  </FooterLink>
                  <FooterLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openPopup(ROUTES.REFUND_POLICY);
                    }}
                  >
                    환불정책
                  </FooterLink>
                </FooterSection>
              </div>
            </FooterContent>
            <FooterContent className="mt-8 border-t border-border/40 pt-8">
              <div className="space-y-1 text-xs text-foreground-muted">
                <p>영선산업 | 대표: 김영선</p>
                <p>
                  주소: 대전광역시 동구 우암로246번길 9-16 (가양동) 영선산업
                </p>
                <p>
                  통신판매업 번호: 2017-대전동구-0353 | 전화번호: 042-626-9055
                </p>
                <p>호스팅사업자: 영선산업 | 사업자등록번호: 305-26-32033</p>
                <p className="mt-3">© 2026 ESSE SION. All rights reserved.</p>
              </div>
            </FooterContent>
          </Footer>
        ) : null}
      </div>
    </div>
  );
}
