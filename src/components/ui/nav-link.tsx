import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const NavLink = ({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <Link
    to={to}
    className={cn(
      // 기본 스타일
      "inline-flex items-center px-4 py-2 text-sm font-medium",
      // 모던 미니멀 스타일
      "transition-all duration-300 ease-in-out",
      // 포커스 스타일
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
      className
    )}
  >
    {children}
  </Link>
);

export default NavLink;
