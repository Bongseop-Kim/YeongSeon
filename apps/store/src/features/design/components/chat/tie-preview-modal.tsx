import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { Crop, Download, Square, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { TieMask } from "@/features/design/components/preview/tie-mask";
import { downloadTiePreviewImage } from "@/features/design/components/preview/download-tie-preview-image";
import { ROUTES } from "@/shared/constants/ROUTES";
import { Button } from "@/shared/ui-extended/button";

interface TiePreviewModalProps {
  imageUrl: string;
  imageStyle?: CSSProperties;
  repeatTileUrl?: string | null;
  onClose: () => void;
}

export function TiePreviewModal({
  imageUrl,
  imageStyle,
  repeatTileUrl,
  onClose,
}: TiePreviewModalProps) {
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const [unmasked, setUnmasked] = useState(false);

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

  const handleDownload = async (event: MouseEvent) => {
    event.stopPropagation();
    try {
      await downloadTiePreviewImage({
        imageUrl,
        repeatTileUrl,
        unmasked,
        filename: unmasked ? "design.png" : "design-masked.png",
      });
    } catch (error) {
      console.error("이미지 다운로드 실패:", error);
      toast.error(
        error instanceof Error
          ? `다운로드 실패: ${error.message}`
          : "다운로드 실패",
      );
    }
  };

  const handleOrderClick = (event: MouseEvent) => {
    event.stopPropagation();
    navigate(ROUTES.CUSTOM_ORDER);
  };

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
      <Button
        type="button"
        variant={unmasked ? "default" : "outline"}
        size="icon"
        className="absolute top-4 left-4 z-10"
        onClick={(e) => {
          e.stopPropagation();
          setUnmasked((v) => !v);
        }}
        title={unmasked ? "넥타이 형태로 보기" : "패턴 전체 보기"}
        aria-label={unmasked ? "넥타이 형태로 보기" : "패턴 전체 보기"}
      >
        {unmasked ? <Crop className="size-4" /> : <Square className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute top-4 left-14 z-10"
        onClick={handleDownload}
        title="이미지 다운로드"
        aria-label="이미지 다운로드"
      >
        <Download className="size-4" />
      </Button>
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="닫기"
        className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-1 text-gray-900 shadow transition-opacity hover:bg-white"
        onClick={onClose}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <div
        data-testid="tie-preview-container"
        className="relative"
        onClick={(event) => event.stopPropagation()}
      >
        {unmasked ? (
          <div
            className="h-[488px] w-[256px]"
            style={imageStyle ?? { background: imageUrl }}
          />
        ) : (
          <TieMask
            imageUrl={imageUrl}
            width={256}
            height={488}
            imageStyle={imageStyle}
            shadowClassName="top-[-46px]"
          />
        )}
      </div>
      <div
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 right-4 z-10"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleOrderClick}
        >
          주문 제작하기
        </Button>
      </div>
    </div>
  );
}
