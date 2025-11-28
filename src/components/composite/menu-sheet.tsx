import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/constants/NAVIGATION_ITEMS";
import NavLink from "@/components/ui/nav-link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function MenuSheet() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden transition-colors duration-200">
          <Menu className="w-5 h-5" />
          <span className="sr-only">메뉴 열기</span>
        </button>
      </SheetTrigger>
      <SheetContent className="bg-zinc-200 pt-10">
        <nav className="space-y-4 flex flex-col">
          {NAVIGATION_ITEMS.map((item) => (
            <div key={item.href} onClick={() => setIsSheetOpen(false)}>
              <NavLink to={item.href} className="gap-2">
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="flex items-center justify-between pr-4">
          <NavLink to="/my-page" onClick={() => setIsSheetOpen(false)}>
            마이페이지
          </NavLink>

          <div>
            <Button variant="secondary" size="sm">
              <span>로그인</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
