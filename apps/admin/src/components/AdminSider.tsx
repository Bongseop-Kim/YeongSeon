import { Link, useLocation, useNavigate } from "react-router-dom";
import { ADMIN_NAV_ITEMS } from "@/components/admin-navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { logoutAdmin } from "@/providers/auth-provider";
import "./admin-layout.css";

interface AdminSiderProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileOpenChange: (open: boolean) => void;
}

export function AdminSider({
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileOpenChange,
}: AdminSiderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isLocalAppEnv = import.meta.env.VITE_APP_ENV === "local";

  const handleNavigate = () => {
    if (isMobile) onMobileOpenChange(false);
  };

  const handleLogout = async () => {
    await logoutAdmin();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          className="adminSiderBackdrop"
          aria-label="메뉴 닫기"
          onClick={() => onMobileOpenChange(false)}
        />
      ) : null}
      <aside
        className={[
          "adminSider",
          collapsed ? "adminSiderCollapsed" : "",
          isMobile ? "adminSiderMobile" : "",
          mobileOpen ? "adminSiderMobileOpen" : "",
          isLocalAppEnv ? "adminSiderLocal" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="관리자 메뉴"
      >
        <div className="adminSiderTitle">
          {collapsed && !isMobile ? "YS" : "ESSE SION"}
        </div>
        <nav className="adminSiderNav" aria-label="관리자 메뉴">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.key}
                to={item.path}
                className="adminSiderLink"
                aria-current={active ? "page" : undefined}
                onClick={handleNavigate}
              >
                <span className="adminSiderLinkMark" aria-hidden="true" />
                {collapsed && !isMobile ? (
                  <span className="adminSiderCollapsedLabel">
                    {item.label.slice(0, 2)}
                  </span>
                ) : (
                  <span>{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="adminSiderFooter">
          {!isMobile ? (
            <button
              type="button"
              className="adminSiderCollapseButton"
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              aria-expanded={!collapsed}
              onClick={() => onCollapsedChange(!collapsed)}
            >
              {collapsed ? "›" : "‹"}
            </button>
          ) : null}
          <button
            type="button"
            className="adminSiderLogoutButton"
            onClick={handleLogout}
          >
            {collapsed && !isMobile ? "나감" : "로그아웃"}
          </button>
        </div>
      </aside>
    </>
  );
}
