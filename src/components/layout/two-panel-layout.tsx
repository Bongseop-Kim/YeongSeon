import React from "react";
import { cn } from "@/lib/utils";
import { PageTitle } from "./main-layout";

interface TwoPanelLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelClassName?: string;
  rightPanelClassName?: string;
  containerClassName?: string;
  stickyRight?: boolean;
  title?: string;
}

export const TwoPanelLayout: React.FC<TwoPanelLayoutProps> = ({
  leftPanel,
  rightPanel,
  leftPanelClassName,
  rightPanelClassName,
  containerClassName,
  stickyRight = false,
  title,
}) => {
  return (
    <div className="max-w-7xl mx-auto py-2 px-4">
      {title && <PageTitle>{title}</PageTitle>}
      {/* Left Panel - Product Info */}
      <div
        className={cn("flex flex-col lg:flex-row gap-4 ", containerClassName)}
      >
        <div className={cn("flex-1 lg:w-2/3", leftPanelClassName)}>
          {leftPanel}
        </div>

        {/* Right Panel - Order Summary */}
        <div className={cn("lg:w-1/3", rightPanelClassName)}>
          <div className={cn(stickyRight && "sticky top-8")}>{rightPanel}</div>
        </div>
      </div>
    </div>
  );
};

export default TwoPanelLayout;
