import { useLocation } from "react-router-dom";
import { getActiveNavItem } from "@/components/admin-navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import "./admin-layout.css";

interface AdminHeaderProps {
  onMenuOpen: () => void;
}

export function AdminHeader({ onMenuOpen }: AdminHeaderProps) {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!isMobile) return null;

  return (
    <header className="adminHeader">
      <button
        type="button"
        className="adminHeaderMenuButton"
        onClick={onMenuOpen}
        aria-label="메뉴 열기"
      >
        ☰
      </button>
      <span className="adminHeaderTitle">
        {getActiveNavItem(location.pathname).label}
      </span>
    </header>
  );
}
