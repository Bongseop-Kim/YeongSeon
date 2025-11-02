import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Router from "@/routes";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
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
import MenuSheet from "../composite/menu-sheet";
import { useSearchStore } from "@/store/search";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideHeaderPaths = ["/shipping"];
  const showHeader = !hideHeaderPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  const [isMobile, setIsMobile] = useState(false);
  const { config } = useSearchStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getCurrentPageName = () => {
    // 데스크톱에서는 항상 영선산업 표시
    if (!isMobile) {
      return "영선산업";
    }

    const { pathname } = location;

    // 정확한 매칭 먼저 시도
    if (ROUTE_TITLES[pathname as keyof typeof ROUTE_TITLES]) {
      return ROUTE_TITLES[pathname as keyof typeof ROUTE_TITLES];
    }

    // 패턴 매칭 (동적 라우트나 하위 경로)
    if (pathname.startsWith("/reform/")) return "수선 상세";
    if (pathname.startsWith("/order/")) return "주문";
    if (pathname.startsWith("/shipping/")) return "배송";
    if (pathname.startsWith("/my-page/")) return "마이페이지";

    return "영선산업";
  };

  const canGoBack = () => {
    return window.history.length > 1 && location.pathname !== "/";
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <>
      {showHeader && (
        <Header size="sm">
          <HeaderContent>
            <HeaderTitle className="flex items-center gap-2 md:gap-4">
              {/* 모바일에서 뒤로가기 버튼 */}
              {canGoBack() && isMobile && (
                <button
                  onClick={handleBackClick}
                  className="hover:text-zinc-50 transition-colors duration-200 p-1 -ml-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="sr-only">뒤로가기</span>
                </button>
              )}
              {getCurrentPageName()}
            </HeaderTitle>

            {/* 데스크톱 네비게이션 */}
            <HeaderNav className="hidden md:flex">
              {NAVIGATION_ITEMS.map((item) => (
                <NavLink key={item.href} to={item.href}>
                  {item.label}
                </NavLink>
              ))}
            </HeaderNav>

            <HeaderActions>
              <MenuSheet />

              <div className="hidden md:flex items-center">
                <NavLink to="/my-page">마이페이지</NavLink>
                <Button variant="secondary" size="sm">
                  <span>로그인</span>
                </Button>
              </div>
            </HeaderActions>
          </HeaderContent>
          {config.enabled && (
            <div className="bg-zinc-200 pb-4 mx-auto px-4 lg:px-8 max-w-7xl flex">
              <SearchBar />

              <SearchSheet />
            </div>
          )}
        </Header>
      )}

      <div className={config.enabled ? "pt-12" : "pt-0"}>
        <Router />
      </div>
    </>
  );
}
