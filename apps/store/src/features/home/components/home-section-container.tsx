import type * as React from "react";

import { cn } from "@/lib/utils";

type HomeSectionContainerProps = React.HTMLAttributes<HTMLDivElement>;

export const HomeSectionContainer = ({
  className,
  ...props
}: HomeSectionContainerProps) => {
  return (
    <div
      className={cn(
        "mx-auto max-w-7xl px-[var(--space-showcase-section-x)] lg:px-[var(--space-showcase-section-x-lg)]",
        className,
      )}
      {...props}
    />
  );
};
