import { Download, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { isActiveGeneration } from "@/entities/design";
import { Button } from "@/shared/ui-extended/button";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { downloadTiePreviewImage } from "@/features/design/components/preview/download-tie-preview-image";
import { cn } from "@/shared/lib/utils";

interface ResultTagBarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  unmasked: boolean;
  onRegenerate: () => void;
}

export function ResultTagBar({
  isFullscreen,
  onToggleFullscreen,
  unmasked,
  onRegenerate,
}: ResultTagBarProps) {
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const generatedImageUrl = useDesignChatStore(
    (state) => state.generatedImageUrl,
  );
  const selectedPreviewImageUrl = useDesignChatStore(
    (state) => state.selectedPreviewImageUrl,
  );
  const repeatTile = useDesignChatStore((state) => state.repeatTile);
  const selectedTilePreview = useDesignChatStore(
    (state) => state.selectedTilePreview,
  );
  const isLoading = isActiveGeneration(generationStatus);

  const hidden = !selectedPreviewImageUrl || isLoading;

  const handleDownload = async () => {
    try {
      await downloadTiePreviewImage({
        imageUrl: selectedPreviewImageUrl ?? generatedImageUrl,
        repeatTileUrl: selectedTilePreview?.repeatTile.url ?? repeatTile?.url,
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

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-1",
        hidden && "invisible",
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        title="같은 조건으로 다시 생성"
        aria-label="같은 조건으로 다시 생성"
        disabled={isLoading}
        onClick={onRegenerate}
      >
        <RefreshCw className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
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
        className="size-8"
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
  );
}
