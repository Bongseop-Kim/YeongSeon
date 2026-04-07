import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analytics } from "@/shared/lib/analytics";

export function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    analytics.pageview(location.pathname + location.search);
  }, [location]);

  return null;
}
