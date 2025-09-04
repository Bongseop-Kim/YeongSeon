import { BrowserRouter } from "react-router-dom";
import Router from "./routes";
import { NavLink } from "@/components/atoms";
import {
  Header,
  HeaderContent,
  HeaderTitle,
  HeaderNav,
  HeaderActions,
  Footer,
  FooterContent,
  FooterSection,
  FooterTitle,
  FooterLink,
} from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ShoppingCart, User, Menu } from "lucide-react";

const navigationItems = [
  { href: "/design", label: "디자인하기" },
  { href: "/order", label: "맞춤 주문" },
  { href: "/reform", label: "수선 서비스" },
];

function App() {
  return (
    <BrowserRouter>
      <Header>
        <HeaderContent>
          <HeaderTitle>영선산업</HeaderTitle>

          {/* 데스크톱 네비게이션 */}
          <HeaderNav className="hidden md:flex">
            {navigationItems.map((item) => (
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
                  <SheetTitle>영선산업</SheetTitle>
                </SheetHeader>
                <div className="mt-8 space-y-6">
                  <nav className="space-y-4">
                    {navigationItems.map((item) => (
                      <NavLink key={item.href} to={item.href}>
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                  <div className="border-t pt-6 space-y-4">
                    <Button variant="outline">
                      <ShoppingCart className="w-5 h-5" />
                      장바구니
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        0
                      </span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* 데스크톱 액션 버튼들 */}
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="sr-only">장바구니</span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  0
                </span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="w-8 h-8 cursor-pointer">
                    <AvatarImage src="" alt="사용자" />
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
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

      <Router />

      <Footer>
        <FooterContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <FooterSection>
              <FooterTitle>서비스</FooterTitle>
              {navigationItems.map((item) => (
                <FooterLink key={item.href} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}
            </FooterSection>
            <FooterSection>
              <FooterTitle>고객지원</FooterTitle>
              <FooterLink href="/faq">자주 묻는 질문</FooterLink>
              <FooterLink href="/contact">문의하기</FooterLink>
              <FooterLink href="/guide">이용 가이드</FooterLink>
            </FooterSection>
            <FooterSection>
              <FooterTitle>회사소개</FooterTitle>
              <FooterLink href="/about">회사 소개</FooterLink>
              <FooterLink href="/history">연혁</FooterLink>
              <FooterLink href="/location">찾아오시는 길</FooterLink>
            </FooterSection>
            <FooterSection>
              <FooterTitle>정책</FooterTitle>
              <FooterLink href="/privacy">개인정보처리방침</FooterLink>
              <FooterLink href="/terms">이용약관</FooterLink>
              <FooterLink href="/refund">환불정책</FooterLink>
            </FooterSection>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              2024 영선산업. All rights reserved.
            </p>
          </div>
        </FooterContent>
      </Footer>
    </BrowserRouter>
  );
}

export default App;
