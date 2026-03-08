import { Download, Maximize2, Minimize2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/lib/utils";

const extractImageUrl = (background: string): string | null => {
  const match = /url\("(.+?)"\)/.exec(background);
  return match?.[1] ?? null;
};

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
  const generationStatus = useDesignChatStore((state) => state.generationStatus);
  const resultTags = useDesignChatStore((state) => state.resultTags);
  const generatedImageUrl = useDesignChatStore((state) => state.generatedImageUrl);
  const markImageDownloaded = useDesignChatStore((state) => state.markImageDownloaded);
  const { regenerate, isLoading } = useDesignChat();

  const hidden = generationStatus === "idle" || generationStatus === "generating";

  const handleDownload = async () => {
    const url = extractImageUrl(generatedImageUrl ?? "");
    if (!url) return;

    if (unmasked) {
      const a = document.createElement("a");
      a.href = url;
      a.download = "design.png";
      a.click();
      markImageDownloaded();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 316;
    canvas.height = 600;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loadImage = async (src: string): Promise<HTMLImageElement> => {
      const image = new Image();
      if (!src.startsWith("data:")) {
        image.crossOrigin = "anonymous";
      }
      image.src = src;

      try {
        await image.decode();
      } catch {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        });
      }

      return image;
    };

    const img = await loadImage(url);
    const maskImg = await loadImage("/images/tie.svg");
    const shadowImg = await loadImage("/images/tieShadow.png");

    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;
    const svgW = 270.3;
    const svgH = 1283;
    const maskScale = Math.min(canvas.width / svgW, canvas.height / svgH);
    const maskW = svgW * maskScale;
    const maskH = svgH * maskScale;
    const maskX = (canvas.width - maskW) / 2;
    const maskY = (canvas.height - maskH) / 2;
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskImg, maskX, maskY, maskW, maskH);
    ctx.globalCompositeOperation = "source-over";
    // CSS: absolute top-[-57px], width/height 미지정 → 자연 크기(397×864), left=0
    // canvas(316×600)가 오른쪽·위쪽 overflow를 자동 클리핑
    ctx.drawImage(shadowImg, 0, -57, 397, 864);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) return;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "design-masked.png";
    a.click();
    URL.revokeObjectURL(objectUrl);
    markImageDownloaded();
  };

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", hidden && "invisible")}>
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
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}
