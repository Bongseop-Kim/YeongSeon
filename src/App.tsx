import { BrowserRouter, useLocation } from "react-router-dom";
import { useState } from "react";
import Router from "./routes";
import { Button } from "@/components/ui/button";
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

import {
  HomeIcon,
  PaletteIcon,
  ShoppingCartIcon,
  ScissorsIcon,
} from "lucide-react";

const ICONS = [
  <HomeIcon className="size-4" />,
  <PaletteIcon className="size-4" />,
  <ShoppingCartIcon className="size-4" />,
  <ScissorsIcon className="size-4" />,
];

function AppLayout() {
  const location = useLocation();
  const hideHeaderPaths = ["/shipping"];
  const showHeader = !hideHeaderPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      {showHeader && (
        <Header size="sm">
          <HeaderContent className="bg-stone-900">
            <HeaderTitle className="text-stone-200 flex items-center gap-2">
              영선산업
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
                <SheetContent side="right" className="w-50 bg-stone-200">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-3">
                      {/* 영선산업 */}
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="space-y-4 flex flex-col">
                    {NAVIGATION_ITEMS.map((item, index) => (
                      <div
                        key={item.href}
                        onClick={() => setIsSheetOpen(false)}
                      >
                        <NavLink to={item.href} className="gap-2">
                          {ICONS[index]}
                          {item.label}
                        </NavLink>
                      </div>
                    ))}
                  </nav>

                  <div className="flex flex-col">
                    <NavLink to="/login">My Page</NavLink>

                    <Button size="sm" className="mx-4">
                      <span>로그인</span>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden md:flex items-center">
                <NavLink to="/login" className="text-stone-50 ">
                  My Page
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
