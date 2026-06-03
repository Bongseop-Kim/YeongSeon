import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
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
      <ActionButton
        type="button"
        variant="neutralWeak"
        className="adminHeaderMenuButton"
        onClick={onMenuOpen}
        aria-label="메뉴 열기"
      >
        ☰
      </ActionButton>
      <Text as="span" textStyle="t6Bold" className="adminHeaderTitle">
        {getActiveNavItem(location.pathname).label}
      </Text>
    </header>
  );
}
