import { Fragment } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/shared/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";

export interface PageBreadcrumbItem {
  label: string;
  to?: string;
}

interface PageBreadcrumbProps {
  items: PageBreadcrumbItem[];
  className?: string;
}

export function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("mb-7 pb-5 pt-6 lg:mb-8 lg:pt-8", className)}>
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap gap-0 overflow-hidden text-[15px] leading-6 sm:gap-0 lg:text-base">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <Fragment key={`${item.label}-${index}`}>
                <BreadcrumbItem className="min-w-0 gap-0">
                  {isLast || !item.to ? (
                    <BreadcrumbPage className="truncate font-semibold">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild className="font-medium">
                      <Link to={item.to}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? (
                  <BreadcrumbSeparator className="mx-2.5 shrink-0 text-zinc-500 [&>svg]:size-4" />
                ) : null}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
