import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { useBreakpoint } from "@/providers/breakpoint-provider";

interface TwoPanelLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftPanelClassName?: string;
  rightPanelClassName?: string;
  containerClassName?: string;
  button?: React.ReactNode;
  detail?: React.ReactNode;
}

export const TwoPanelLayout: React.FC<TwoPanelLayoutProps> = ({
  leftPanel,
  rightPanel,
  leftPanelClassName,
  rightPanelClassName,
  containerClassName,
  button,
  detail,
}) => {
  const { isMobile } = useBreakpoint();

  return (
    <div className={`max-w-7xl mx-auto ${isMobile ? "" : "px-8 pb-4"}`}>
      {/* Left Panel - Product Info */}
      <div
        className={cn(
          `flex ${isMobile ? "flex-col" : "flex-row gap-8"}`,
          containerClassName
        )}
      >
        <div
          className={cn(
            "w-full",
            !isMobile && rightPanel ? "flex-1 w-2/3" : "",
            leftPanelClassName
          )}
        >
          {leftPanel}
          {rightPanel && isMobile && <Separator />}

          {/* Detail section - appears below leftPanel on desktop */}
          {detail && !isMobile && (
            <div>
              <Separator />
              {detail}
            </div>
          )}
        </div>

        {rightPanel && (
          <div
            className={cn(
              isMobile ? "w-full relative" : "w-1/3 sticky top-20 self-start",
              button && (isMobile ? "pb-14" : "pb-0"),
              rightPanelClassName
            )}
          >
            {rightPanel}

            {button && (
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
                {button}
              </div>
            )}
          </div>
        )}

        {/* Detail section - appears below rightPanel on mobile */}
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

export default TwoPanelLayout;
