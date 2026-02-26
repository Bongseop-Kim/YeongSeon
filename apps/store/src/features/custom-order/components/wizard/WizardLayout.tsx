import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/providers/breakpoint-provider";

interface WizardLayoutProps {
  progressBar: ReactNode;
  children: ReactNode;
  navigation: ReactNode;
  summary: ReactNode;
  mobileBottomBar: ReactNode;
}

export const WizardLayout = ({
  progressBar,
  children,
  navigation,
  summary,
  mobileBottomBar,
}: WizardLayoutProps) => {
  const { isMobile } = useBreakpoint();

  return (
    <div className={cn("max-w-7xl mx-auto", !isMobile && "px-8 pb-4")}>
      {progressBar}

      <div
        className={cn(
          "flex",
          isMobile ? "flex-col" : "flex-row gap-8"
        )}
      >
        {/* Step Content */}
        <div
          className={cn(
            "w-full",
            !isMobile && "flex-1 w-2/3"
          )}
        >
          {children}
          {!isMobile && navigation}
        </div>

        {/* Summary Sidebar */}
        {!isMobile && (
          <div className="w-1/3 sticky top-20 self-start">
            {summary}
          </div>
        )}

        {/* Mobile: Summary below content */}
        {isMobile && (
          <div className="w-full pb-24">
            {summary}
          </div>
        )}
      </div>

      {/* Mobile fixed bottom bar */}
      {isMobile && (
        <div
          className="z-30 fixed bottom-0 left-0 right-0 px-4 bg-white pt-3 border-t"
          style={{
            paddingBottom:
              "calc(0.75rem + env(safe-area-inset-bottom, 0))",
          }}
        >
          {mobileBottomBar}
        </div>
      )}
    </div>
  );
};
