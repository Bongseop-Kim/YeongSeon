import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Tailwind CSS 기본 breakpoint 정의
 */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

interface BreakpointContextValue {
  width: number;
  isMobile: boolean; // < lg (1024px)
  isTablet: boolean; // >= md (768px) && < lg (1024px)
  isDesktop: boolean; // >= lg (1024px)
  isAbove: (breakpoint: Breakpoint) => boolean;
  isBelow: (breakpoint: Breakpoint) => boolean;
}

const BreakpointContext = createContext<BreakpointContextValue | undefined>(
  undefined
);

/**
 * debounce 유틸리티
 */
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface BreakpointProviderProps {
  children: ReactNode;
}

export function BreakpointProvider({ children }: BreakpointProviderProps) {
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return 0;
    return window.innerWidth;
  });

  useEffect(() => {
    // 초기값 설정
    setWidth(window.innerWidth);

    // debounced resize handler
    const handleResize = debounce(() => {
      setWidth(window.innerWidth);
    }, 150);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const value: BreakpointContextValue = {
    width,
    isMobile: width < BREAKPOINTS.lg,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isAbove: (breakpoint: Breakpoint) => width >= BREAKPOINTS[breakpoint],
    isBelow: (breakpoint: Breakpoint) => width < BREAKPOINTS[breakpoint],
  };

  return (
    <BreakpointContext.Provider value={value}>
      {children}
    </BreakpointContext.Provider>
  );
}

/**
 * Breakpoint context를 사용하는 훅
 *
 * @example
 * ```tsx
 * const { isMobile, isDesktop } = useBreakpoint();
 *
 * if (isMobile) {
 *   // 모바일 로직
 * }
 * ```
 *
 * @example
 * ```tsx
 * const { isAbove, isBelow } = useBreakpoint();
 *
 * if (isAbove('md')) {
 *   // md 이상일 때
 * }
 * ```
 */
export function useBreakpoint() {
  const context = useContext(BreakpointContext);
  if (!context) {
    throw new Error("useBreakpoint must be used within BreakpointProvider");
  }
  return context;
}

/**
 * 기존 코드와의 호환성을 위한 useIsMobile 훅
 * @deprecated useBreakpoint().isMobile 사용 권장
 */
export function useIsMobile() {
  const { isMobile } = useBreakpoint();
  return isMobile;
}
