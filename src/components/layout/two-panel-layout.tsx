import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";

interface TwoPanelLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftPanelClassName?: string;
  rightPanelClassName?: string;
  containerClassName?: string;
  button?: React.ReactNode;
}

export const TwoPanelLayout: React.FC<TwoPanelLayoutProps> = ({
  leftPanel,
  rightPanel,
  leftPanelClassName,
  rightPanelClassName,
  containerClassName,
  button,
}) => {
  return (
    <div className="max-w-7xl lg:px-8 lg:pt-4 lg:pb-4 mx-auto">
      {/* Left Panel - Product Info */}
      <div
        className={cn("flex flex-col lg:flex-row lg:gap-8", containerClassName)}
      >
        <div
          className={cn(
            "w-full",
            rightPanel ? "lg:flex-1 lg:w-2/3" : "",
            leftPanelClassName
          )}
        >
          {leftPanel}
          {rightPanel && <Separator />}
        </div>

        {rightPanel && (
          <div
            className={cn(
              "w-full lg:w-1/3 relative mb-16",
              rightPanelClassName
            )}
          >
            {rightPanel}

            {button && (
              <div className="fixed bottom-2 left-0 right-0 mt-4 px-2 lg:relative lg:left-auto lg:right-auto lg:bottom-auto lg:px-0">
                {button}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoPanelLayout;
