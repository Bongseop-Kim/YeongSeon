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
  const mobileActionBar =
    isMobile && actionBar ? (
      <div
        className="fixed bottom-0 left-0 right-0 z-30 mt-4 border-t border-border bg-background/96 px-2 pt-2 backdrop-blur"
        style={{
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0))",
        }}
      >
        {actionBar}
      </div>
    ) : null;

  return (
    <div
      className={cn("mx-auto max-w-7xl lg:px-6 xl:px-8", !isMobile && "pb-4")}
    >
      <div
        className={cn(
          `flex ${isMobile ? "flex-col" : "flex-row gap-4"}`,
          className,
        )}
      >
        <div
          className={cn(
            "w-full",
            !isMobile && sidebar ? "flex-1 w-2/3 pt-6" : "",
            contentClassName,
            isMobile && actionBar ? "pb-24" : "",
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
              sidebarClassName,
            )}
          >
            {sidebar}

            {actionBar && !isMobile && (
              <div className="relative mt-4">{actionBar}</div>
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

      {mobileActionBar}
    </div>
  );
};
