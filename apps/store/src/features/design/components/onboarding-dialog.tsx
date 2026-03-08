import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ONBOARDING_PAGES } from "@/features/design/constants/onboarding";

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const page = ONBOARDING_PAGES[currentPage];

  useEffect(() => {
    if (open) {
      setCurrentPage(0);
    }
  }, [open]);

  const previewImages = ["/images/yarn-dyed.png", "/images/print.png"];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="max-w-sm overflow-hidden p-0"
        showCloseButton={false}
      >
        <img
          src={previewImages[currentPage]}
          alt=""
          className="h-44 w-full object-cover"
        />
        <div className="px-6 pb-6 pt-5">
          <DialogTitle className="mb-2 text-lg font-bold">
            {page.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-gray-600">
            {page.description}
          </DialogDescription>
        </div>
        <div className="flex items-center justify-between px-6 pb-6">
          <div className="flex items-center gap-1.5">
            {ONBOARDING_PAGES.map((_, index) => (
              <span
                key={index}
                className={[
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  index === currentPage ? "bg-gray-700" : "bg-gray-300",
                ].join(" ")}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {currentPage > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                ← 이전
              </Button>
            )}
            {currentPage < ONBOARDING_PAGES.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                다음 →
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={onClose}>
                시작하기
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
