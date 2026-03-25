import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const NavLink = ({
  to,
  children,
  className,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "inline-flex items-center px-4 py-2 text-sm font-medium text-white/88 hover:text-white",
      "transition-all duration-300 ease-in-out",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface-strong",
      className,
    )}
  >
    {children}
  </Link>
);

export default NavLink;
