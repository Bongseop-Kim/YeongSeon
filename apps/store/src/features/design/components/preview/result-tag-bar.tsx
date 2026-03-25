import { Download, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui-extended/button";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/lib/utils";

const extractImageUrl = (background: string): string | null => {
  const match = /url\("(.+?)"\)/.exec(background);
  return match?.[1] ?? null;
};

const SHADOW_TOP_OFFSET = -57;

interface ResultTagBarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  unmasked: boolean;
}

export function ResultTagBar({
  isFullscreen,
  onToggleFullscreen,
  unmasked,
}: ResultTagBarProps) {
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const resultTags = useDesignChatStore((state) => state.resultTags);
  const generatedImageUrl = useDesignChatStore(
    (state) => state.generatedImageUrl,
  );
  const markImageDownloaded = useDesignChatStore(
    (state) => state.markImageDownloaded,
  );
  const { regenerate, isLoading } = useDesignChat();

  const hidden =
    generationStatus === "idle" || generationStatus === "generating";

  const handleDownload = async () => {
    const url = extractImageUrl(generatedImageUrl ?? "");
    if (!url) {
      toast.error("이미지 URL을 추출할 수 없습니다.");
      return;
    }

    if (unmasked) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch image: ${res.status}`);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = "design.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        markImageDownloaded();
      } catch {
        window.open(url, "_blank");
      }
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 316;
    canvas.height = 600;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("canvas 2D context 없음");
      toast.error("다운로드 실패: canvas를 초기화할 수 없습니다.");
      return;
    }

    const loadImage = async (src: string): Promise<HTMLImageElement> => {
      const image = new Image();
      if (!src.startsWith("data:")) {
        image.crossOrigin = "anonymous";
      }
      const loadPromise = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      });
      image.src = src;

      try {
        await image.decode();
      } catch {
        if (image.complete && image.naturalWidth > 0) {
          return image;
        }
        await loadPromise;
      }

      return image;
    };

    let img: HTMLImageElement;
    let maskImg: HTMLImageElement;
    let shadowImg: HTMLImageElement;
    try {
      [img, maskImg, shadowImg] = await Promise.all([
        loadImage(url),
        loadImage("/images/tie.svg"),
        loadImage("/images/tieShadow.png"),
      ]);
    } catch (err) {
      console.error("이미지 로드 실패:", err);
      toast.error("다운로드 실패: 이미지를 불러올 수 없습니다.");
      return;
    }

    const scale = Math.max(
      canvas.width / img.naturalWidth,
      canvas.height / img.naturalHeight,
    );
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;
    const maskScale = Math.min(
      canvas.width / maskImg.naturalWidth,
      canvas.height / maskImg.naturalHeight,
    );
    const maskW = maskImg.naturalWidth * maskScale;
    const maskH = maskImg.naturalHeight * maskScale;
    const maskX = (canvas.width - maskW) / 2;
    const maskY = (canvas.height - maskH) / 2;
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskImg, maskX, maskY, maskW, maskH);
    ctx.globalCompositeOperation = "source-over";
    // CSS: absolute top-[-57px], width/height 미지정 → 자연 크기(397×864), left=0
    // canvas(316×600)가 오른쪽·위쪽 overflow를 자동 클리핑
    ctx.drawImage(
      shadowImg,
      0,
      SHADOW_TOP_OFFSET,
      shadowImg.naturalWidth,
      shadowImg.naturalHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) {
      console.error("canvas.toBlob 실패: blob이 null");
      toast.error("다운로드 실패: 이미지를 변환할 수 없습니다.");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "design-masked.png";
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      markImageDownloaded();
    }, 100);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        hidden && "invisible",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {resultTags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title="같은 조건으로 다시 생성"
          aria-label="같은 조건으로 다시 생성"
          disabled={isLoading}
          onClick={regenerate}
        >
          <RefreshCw className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title="이미지 다운로드"
          aria-label="이미지 다운로드"
          onClick={handleDownload}
        >
          <Download className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title={isFullscreen ? "전체화면 종료" : "전체화면"}
          aria-label={isFullscreen ? "전체화면 종료" : "전체화면"}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="size-3.5" />
          ) : (
            <Maximize2 className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
