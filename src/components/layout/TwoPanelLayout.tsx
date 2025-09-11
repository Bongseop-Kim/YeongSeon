import React from "react";
import { cn } from "@/lib/utils";

interface TwoPanelLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelClassName?: string;
  rightPanelClassName?: string;
  containerClassName?: string;
  stickyRight?: boolean;
}

export const TwoPanelLayout: React.FC<TwoPanelLayoutProps> = ({
  leftPanel,
  rightPanel,
  leftPanelClassName,
  rightPanelClassName,
  containerClassName,
  stickyRight = false,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto py-8 px-4",
        containerClassName
      )}
    >
      {/* Left Panel - Product Info */}
      <div className={cn("flex-1 lg:w-2/3", leftPanelClassName)}>
        {leftPanel}
      </div>

      {/* Right Panel - Order Summary */}
      <div className={cn("lg:w-1/3", rightPanelClassName)}>
        <div className={cn(stickyRight && "sticky top-8")}>{rightPanel}</div>
      </div>
    </div>
  );
};

export default TwoPanelLayout;
