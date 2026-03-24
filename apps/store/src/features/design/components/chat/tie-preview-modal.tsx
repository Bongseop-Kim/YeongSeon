import { useEffect, useRef } from "react";

import { TieMask } from "@/features/design/components/preview/tie-mask";

interface TiePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function TiePreviewModal({ imageUrl, onClose }: TiePreviewModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const container = overlayRef.current;
      if (!container) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true",
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      data-testid="tie-preview-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="넥타이 미리보기"
      onClick={onClose}
    >
      <div
        data-testid="tie-preview-container"
        className="relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close"
          className="absolute top-2 right-2 z-10 rounded-full bg-white/90 px-2 py-1 text-sm text-gray-900 shadow"
          onClick={onClose}
        >
          닫기
        </button>
        <TieMask
          imageUrl={imageUrl}
          width={256}
          height={488}
          shadowClassName="top-[-46px]"
        />
      </div>
    </div>
  );
}
