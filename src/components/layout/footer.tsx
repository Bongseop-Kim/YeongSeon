import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const footerVariants = cva("w-full border-t bg-gray-50/50", {
  variants: {
    variant: {
      default: "border-gray-200/60",
      ghost: "border-transparent",
      solid: "bg-gray-50 border-gray-200",
    },
    size: {
      sm: "py-8",
      md: "py-12",
      lg: "py-16",
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
  <div
    ref={ref}
    className={cn("container mx-auto max-w-7xl px-6 lg:px-8", className)}
    {...props}
  />
));
FooterContent.displayName = "FooterContent";

const FooterSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
FooterSection.displayName = "FooterSection";

const FooterTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm font-semibold tracking-wide text-gray-900 uppercase",
      className
    )}
    {...props}
  />
));
FooterTitle.displayName = "FooterTitle";

const FooterLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      "text-sm text-gray-600 transition-colors duration-200 hover:text-gray-900 block py-1",
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
    className={cn("text-sm text-gray-600 leading-relaxed", className)}
    {...props}
  />
));

export {
  Footer,
  FooterContent,
  FooterSection,
  FooterTitle,
  FooterLink,
  FooterText,
  footerVariants,
};
