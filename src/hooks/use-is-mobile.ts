import { useState, useEffect } from "react";

/**
 * 모바일 화면 여부를 감지하는 커스텀 훅
 * @param breakpoint - 모바일로 간주할 최대 너비 (기본값: 768px)
 * @returns 현재 화면이 모바일인지 여부
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}
