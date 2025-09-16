import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";

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
    <div className="max-w-7xl lg:px-8 lg:pt-4">
      {/* Left Panel - Product Info */}
      <div
        className={cn("flex flex-col lg:flex-row lg:gap-8", containerClassName)}
      >
        <div className={cn("w-full lg:flex-1 lg:w-2/3", leftPanelClassName)}>
          {leftPanel}
          <Separator />
        </div>

        {/* Right Panel - Order Summary */}
        <div className={cn("w-full lg:w-1/3", rightPanelClassName)}>
          <div className={cn(stickyRight && "lg:sticky lg:top-8")}>
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoPanelLayout;
