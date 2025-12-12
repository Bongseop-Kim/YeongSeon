import { PageTitle } from "@/components/layout/main-layout";
import CloseButton from "@/components/ui/close";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PopupLayoutProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerContent?: ReactNode;
  footer?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
}

export const PopupLayout = ({
  title,
  onClose,
  children,
  headerContent,
  footer,
  headerClassName,
  contentClassName,
}: PopupLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* header */}
      <div
        className={cn("sticky top-0 z-10 bg-zinc-100 px-2", headerClassName)}
      >
        <div className="flex items-center justify-between">
          <PageTitle className="text-base">{title}</PageTitle>
          <CloseButton onRemove={onClose} />
        </div>
        {headerContent}
      </div>

      {/* content */}
      <div className={cn("flex-1 px-2 py-4", contentClassName)}>{children}</div>

      {/* footer */}
      {footer && (
        <div className="sticky bottom-0 bg-white border-t p-2 py-4">
          {footer}
        </div>
      )}
    </div>
  );
};
