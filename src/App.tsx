import { BrowserRouter, useLocation } from "react-router-dom";
import Router from "./routes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Providers } from "./providers";
import { NAVIGATION_ITEMS } from "./constants";
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
  const hideHeaderPaths = ["/shipping"];
  const showHeader = !hideHeaderPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  return (
    <>
      {showHeader && (
        <Header size="sm">
          <HeaderContent className="bg-stone-900">
            <HeaderTitle className="text-stone-50 flex items-center gap-2">
              영선산업
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
              {/* 모바일 햄버거 메뉴 */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="md:hidden p-2 text-gray-700 hover:text-gray-900 transition-colors duration-200">
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">메뉴 열기</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-3">
                      영선산업
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-8 space-y-6">
                    <nav className="space-y-4">
                      {NAVIGATION_ITEMS.map((item) => (
                        <NavLink key={item.href} to={item.href}>
                          {item.label}
                        </NavLink>
                      ))}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>

              {/* 데스크톱 액션 버튼들 */}
              <div className="hidden md:flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="sm">
                      <span className="text-stone-50">로그인</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Profile</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Logout</DropdownMenuLabel>
                  </DropdownMenuContent>
                </DropdownMenu>
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
