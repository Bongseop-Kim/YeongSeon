import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
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

interface Point {
  x: number;
  y: number;
}

const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 4;

const distanceBetween = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const clampScale = (scale: number) =>
  Math.min(Math.max(scale, MIN_ZOOM_SCALE), MAX_ZOOM_SCALE);

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
  const activePointersRef = useRef(new Map<number, Point>());
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const panStartRef = useRef<{
    point: Point;
    offset: Point;
  } | null>(null);
  const [unmasked, setUnmasked] = useState(false);
  const [zoomState, setZoomState] = useState({
    scale: MIN_ZOOM_SCALE,
    offsetX: 0,
    offsetY: 0,
  });

  const resetZoom = () => {
    activePointersRef.current.clear();
    pinchStartRef.current = null;
    panStartRef.current = null;
    setZoomState({
      scale: MIN_ZOOM_SCALE,
      offsetX: 0,
      offsetY: 0,
    });
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    resetZoom();
  }, [unmasked]);

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

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const nextPoint = { x: event.clientX, y: event.clientY };
    activePointersRef.current.set(event.pointerId, nextPoint);

    const points = Array.from(activePointersRef.current.values());
    if (points.length >= 2) {
      const distance = distanceBetween(points[0], points[1]);
      if (distance === 0) {
        pinchStartRef.current = null;
        panStartRef.current = null;
        return;
      }
      pinchStartRef.current = {
        distance,
        scale: zoomState.scale,
      };
      panStartRef.current = null;
      return;
    }

    if (zoomState.scale > MIN_ZOOM_SCALE) {
      panStartRef.current = {
        point: nextPoint,
        offset: {
          x: zoomState.offsetX,
          y: zoomState.offsetY,
        },
      };
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }

    const activePointers = activePointersRef.current;
    if (!activePointers.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = Array.from(activePointers.values());
    if (points.length >= 2 && pinchStartRef.current) {
      const nextDistance = distanceBetween(points[0], points[1]);
      const nextScale = clampScale(
        pinchStartRef.current.scale *
          (nextDistance / pinchStartRef.current.distance),
      );

      setZoomState((current) => ({
        ...current,
        scale: nextScale,
        offsetX: nextScale === MIN_ZOOM_SCALE ? 0 : current.offsetX,
        offsetY: nextScale === MIN_ZOOM_SCALE ? 0 : current.offsetY,
      }));
      return;
    }

    if (points.length === 1 && panStartRef.current) {
      const point = points[0];
      const panStart = panStartRef.current;
      setZoomState((current) =>
        current.scale <= MIN_ZOOM_SCALE
          ? current
          : {
              ...current,
              offsetX: panStart.offset.x + point.x - panStart.point.x,
              offsetY: panStart.offset.y + point.y - panStart.point.y,
            },
      );
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activePointersRef.current.delete(event.pointerId);
    pinchStartRef.current = null;

    const points = Array.from(activePointersRef.current.values());
    if (points.length === 1 && zoomState.scale > MIN_ZOOM_SCALE) {
      panStartRef.current = {
        point: points[0],
        offset: {
          x: zoomState.offsetX,
          y: zoomState.offsetY,
        },
      };
    } else {
      panStartRef.current = null;
    }
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
        style={{
          touchAction: "none",
          transform: `translate3d(${zoomState.offsetX}px, ${zoomState.offsetY}px, 0) scale(${zoomState.scale})`,
        }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {unmasked ? (
          <div
            className="h-[488px] w-[256px]"
            style={
              imageStyle ?? {
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            }
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
