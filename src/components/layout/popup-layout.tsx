import { PageTitle } from "@/components/layout/main-layout";
import CloseButton from "@/components/ui/close";
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
    <div className="min-h-screen w-full relative">
      <div
        className={`fixed top-0 left-0 right-0 z-10 bg-zinc-100 px-2 ${
          headerContent ? "pb-4" : ""
        } ${headerClassName || ""}`}
      >
        <div className="flex items-center justify-between">
          <PageTitle className="text-base">{title}</PageTitle>
          <CloseButton
            onRemove={() => {
              onClose();
            }}
          />
        </div>
        {headerContent && <div className="mt-2">{headerContent}</div>}
      </div>

      <div
        className={`px-2 py-4 pb-20 pt-20 ${contentClassName || ""}`}
        style={{
          paddingTop: headerContent ? "6rem" : "4rem",
        }}
      >
        {children}
      </div>

      {footer && (
        <div className="fixed bottom-0 left-0 right-0 p-2 py-4 bg-white border-t">
          {footer}
        </div>
      )}
    </div>
  );
};
