import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/constants/NAVIGATION_ITEMS";
import NavLink from "@/components/ui/nav-link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useAuthStore } from "@/store/auth";
import { useSignOut } from "@/features/auth/api/auth.query";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";

export default function MenuSheet() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { isMobile } = useBreakpoint();
  const { user } = useAuthStore();
  const signOutMutation = useSignOut();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
      setIsSheetOpen(false);
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!isMobile) return null;

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <button className="transition-colors duration-200 text-zinc-50">
          <Menu className="w-5 h-5" />
          <span className="sr-only">메뉴 열기</span>
        </button>
      </SheetTrigger>
      <SheetContent className="bg-zinc-900 pt-10">
        <nav className="space-y-4 flex flex-col">
          {NAVIGATION_ITEMS.map((item) => (
            <div key={item.href} onClick={() => setIsSheetOpen(false)}>
              <NavLink to={item.href} className="gap-2 w-full">
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
                onClick={() => {
                  setIsSheetOpen(false);
                  navigate(ROUTES.LOGIN);
                }}
              >
                <span>로그인</span>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
