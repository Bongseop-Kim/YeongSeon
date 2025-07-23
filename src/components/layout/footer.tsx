import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const footerVariants = cva("w-full border-t bg-background", {
  variants: {
    variant: {
      default: "border-border",
      ghost: "border-transparent",
      solid: "bg-muted/50",
    },
    size: {
      sm: "py-4",
      md: "py-6",
      lg: "py-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export interface FooterProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof footerVariants> {}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <footer
        className={cn(footerVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Footer.displayName = "Footer";

const FooterContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("container px-4", className)} {...props} />
));
FooterContent.displayName = "FooterContent";

const FooterSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-3", className)} {...props} />
));
FooterSection.displayName = "FooterSection";

const FooterTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
FooterTitle.displayName = "FooterTitle";

const FooterLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground transition-colors hover:text-foreground",
      className
    )}
    {...props}
  />
));
FooterLink.displayName = "FooterLink";

const FooterText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
FooterText.displayName = "FooterText";

export {
  Footer,
  FooterContent,
  FooterSection,
  FooterTitle,
  FooterLink,
  FooterText,
  footerVariants,
};
