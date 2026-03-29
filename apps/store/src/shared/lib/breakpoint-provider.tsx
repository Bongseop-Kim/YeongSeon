import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isAbove: (breakpoint: Breakpoint) => boolean;
  isBelow: (breakpoint: Breakpoint) => boolean;
}

const BreakpointContext = createContext<BreakpointContextValue | undefined>(
  undefined,
);

function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
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
    setWidth(window.innerWidth);

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

export function useBreakpoint() {
  const context = useContext(BreakpointContext);
  if (!context) {
    throw new Error("useBreakpoint must be used within BreakpointProvider");
  }
  return context;
}
