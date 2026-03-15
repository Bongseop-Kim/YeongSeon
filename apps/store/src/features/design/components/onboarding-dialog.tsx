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

const ONBOARDING_PAGE_IMAGE_BY_INDEX = [
  "/images/yarn-dyed.png",
  "/images/print.png",
] as const;

const ONBOARDING_DIALOG_PAGES = ONBOARDING_PAGES.map((page, index) => {
  const imageSrc = ONBOARDING_PAGE_IMAGE_BY_INDEX[index];
  if (!imageSrc) {
    throw new Error(`Missing onboarding dialog image for page index ${index}.`);
  }

  return {
    ...page,
    imageSrc,
  };
});

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const hasPages = ONBOARDING_DIALOG_PAGES.length > 0;
  const safePageIndex = hasPages
    ? Math.min(currentPage, ONBOARDING_DIALOG_PAGES.length - 1)
    : 0;
  const page = ONBOARDING_DIALOG_PAGES[safePageIndex];

  useEffect(() => {
    if (open) {
      setCurrentPage(0);
    }
  }, [open]);

  useEffect(() => {
    if (!hasPages) {
      setCurrentPage(0);
      return;
    }

    setCurrentPage((prevPage) =>
      Math.min(prevPage, ONBOARDING_DIALOG_PAGES.length - 1),
    );
  }, [hasPages]);

  if (!page) {
    return (
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent
          className="max-w-sm overflow-hidden p-0"
          showCloseButton={false}
        >
          <div className="px-6 pb-6 pt-5">
            <DialogTitle className="mb-2 text-lg font-bold">
              온보딩 안내
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600">
              온보딩 정보를 불러오지 못했습니다.
            </DialogDescription>
          </div>
          <div className="flex justify-end px-6 pb-6">
            <Button type="button" size="sm" onClick={onClose}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="max-w-sm overflow-hidden p-0"
        showCloseButton={false}
      >
        <img
          src={page.imageSrc}
          alt={`${page.title} 예시 이미지`}
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
            {ONBOARDING_DIALOG_PAGES.map((_, index) => (
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
            {safePageIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentPage((prevPage) => Math.max(prevPage - 1, 0))
                }
              >
                ← 이전
              </Button>
            )}
            {safePageIndex < ONBOARDING_DIALOG_PAGES.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setCurrentPage((prevPage) =>
                    Math.min(prevPage + 1, ONBOARDING_DIALOG_PAGES.length - 1),
                  )
                }
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
