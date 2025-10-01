import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Router from "./routes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ChevronLeft } from "lucide-react";
import { Providers } from "./providers";
import { NAVIGATION_ITEMS } from "./constants/NAVIGATION_ITEMS";
import {
  Header,
  HeaderActions,
  HeaderContent,
  HeaderNav,
  HeaderTitle,
} from "./components/composite/header";
import NavLink from "./components/ui/nav-link";

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideHeaderPaths = ["/shipping"];
  const showHeader = !hideHeaderPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

    // 정확한 경로 매칭
    const routeTitles: Record<string, string> = {
      "/": "영선산업",
      "/design": "디자인",
      "/custom-order": "주문 제작",
      "/reform": "수선",
      "/order/order-form": "주문서 작성",
      "/order/order-list": "주문 내역",
      "/shipping": "배송",
      "/shipping/form": "배송 정보",
      "/my-page": "마이페이지",
      "/my-page/my-info": "내 정보",
      "/my-page/my-info/detail": "개인정보 수정",
      "/my-page/my-info/email": "이메일 변경",
      "/my-page/my-info/notice": "마케팅 수신 동의",
      "/my-page/my-info/leave": "회원 탈퇴",
    };

    // 정확한 매칭 먼저 시도
    if (routeTitles[pathname]) {
      return routeTitles[pathname];
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
            <HeaderTitle className="text-stone-200 flex items-center gap-2">
              {/* 모바일에서 뒤로가기 버튼 */}
              {canGoBack() && isMobile && (
                <button
                  onClick={handleBackClick}
                  className="text-stone-200 hover:text-stone-50 transition-colors duration-200 p-1 -ml-2"
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
                <NavLink
                  key={item.href}
                  to={item.href}
                  className="text-stone-50"
                >
                  {item.label}
                </NavLink>
              ))}
            </HeaderNav>

            <HeaderActions>
              {/* 모바일 햄버거 메뉴 */}
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <button className="md:hidden text-stone-200 hover:text-stone-900 transition-colors duration-200">
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">메뉴 열기</span>
                  </button>
                </SheetTrigger>
                <SheetContent className="bg-stone-900">
                  <nav className="space-y-4 flex flex-col">
                    {NAVIGATION_ITEMS.map((item) => (
                      <div
                        key={item.href}
                        onClick={() => setIsSheetOpen(false)}
                      >
                        <NavLink to={item.href} className="gap-2 text-stone-50">
                          {item.label}
                        </NavLink>
                      </div>
                    ))}
                  </nav>

                  <div className="flex items-center justify-between">
                    <NavLink
                      to="/my-page"
                      className="text-stone-50"
                      onClick={() => setIsSheetOpen(false)}
                    >
                      마이페이지
                    </NavLink>

                    <div>
                      <Button variant="ghost" size="sm">
                        <span className="text-stone-50">로그인</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden md:flex items-center">
                <NavLink to="/my-page" className="text-stone-50 ">
                  마이페이지
                </NavLink>
                <Button variant="ghost" size="sm">
                  <span className="text-stone-50">로그인</span>
                </Button>
              </div>
            </HeaderActions>
          </HeaderContent>
        </Header>
      )}

      <Router />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppLayout />
      </Providers>
    </BrowserRouter>
  );
}

export default App;
