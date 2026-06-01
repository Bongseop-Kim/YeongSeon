export interface AdminNavItem {
  key: string;
  label: string;
  path: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: "dashboard", label: "대시보드", path: "/" },
  { key: "orders", label: "주문 관리", path: "/orders" },
  { key: "products", label: "상품 관리", path: "/products" },
  { key: "coupons", label: "쿠폰 관리", path: "/coupons" },
  { key: "quote-requests", label: "견적 관리", path: "/quote-requests" },
  { key: "claims", label: "클레임 관리", path: "/claims" },
  { key: "customers", label: "고객 관리", path: "/customers" },
  { key: "inquiries", label: "문의 관리", path: "/inquiries" },
  { key: "pricing", label: "가격 관리", path: "/pricing" },
  { key: "generation-logs", label: "AI 생성 로그", path: "/generation-logs" },
  { key: "settings", label: "설정", path: "/settings" },
];

export function getActiveNavItem(pathname: string): AdminNavItem {
  let activeItem = ADMIN_NAV_ITEMS[0];

  for (const item of ADMIN_NAV_ITEMS) {
    const active =
      item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);

    if (active && item.path.length > activeItem.path.length) {
      activeItem = item;
    }
  }

  return activeItem;
}
