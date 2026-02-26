import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useBreakpoint } from "@/providers/breakpoint-provider";

interface PageLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  contentClassName?: string;
  sidebarClassName?: string;
  className?: string;
  actionBar?: React.ReactNode;
  detail?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  sidebar,
  contentClassName,
  sidebarClassName,
  className,
  actionBar,
  detail,
}) => {
  const { isMobile } = useBreakpoint();

  return (
    <div className={`max-w-7xl mx-auto ${isMobile ? "" : "px-8 pb-4"}`}>
      {/* Left Panel - Product Info */}
      <div
        className={cn(
          `flex ${isMobile ? "flex-col" : "flex-row gap-8"}`,
          className
        )}
      >
        <div
          className={cn(
            "w-full",
            !isMobile && sidebar ? "flex-1 w-2/3" : "",
            contentClassName
          )}
        >
          {children}
          {sidebar && isMobile && <Separator />}

          {/* Detail section - appears below children on desktop */}
          {detail && !isMobile && (
            <div>
              <Separator />
              {detail}
            </div>
          )}
        </div>

        {sidebar && (
          <div
            className={cn(
              isMobile ? "w-full relative" : "w-1/3 sticky top-20 self-start",
              actionBar && (isMobile ? "pb-24" : "pb-0"),
              sidebarClassName
            )}
          >
            {sidebar}

            {actionBar && (
              <div
                className={
                  isMobile
                    ? "z-30 fixed bottom-0 left-0 right-0 mt-4 px-2 bg-white pt-2 border-t"
                    : "relative mt-4"
                }
                style={
                  isMobile
                    ? {
                        paddingBottom:
                          "calc(0.5rem + env(safe-area-inset-bottom, 0))",
                      }
                    : undefined
                }
              >
                {actionBar}
              </div>
            )}
          </div>
        )}

        {/* Detail section - appears below sidebar on mobile */}
        {detail && isMobile && (
          <div className="w-full">
            <Separator />
            {detail}
          </div>
        )}
      </div>
    </div>
  );
};
