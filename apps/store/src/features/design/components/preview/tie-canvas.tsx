import { useShallow } from "zustand/react/shallow";
import { isActiveGeneration } from "@/entities/design";
import {
  TieMask,
  tieMaskStyle,
} from "@/features/design/components/preview/tie-mask";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

const TILE_BACKGROUND_SIZE = "80px 80px";
const ACCENT_TILE_BOTTOM = "20%";

const tileRepeatStyle = (url: string) => ({
  backgroundImage: `url("${url}")`,
  backgroundRepeat: "repeat" as const,
  backgroundSize: TILE_BACKGROUND_SIZE,
});

interface TieCanvasProps {
  unmasked?: boolean;
}

export function TieCanvas({ unmasked = false }: TieCanvasProps) {
  const {
    generationStatus,
    selectedPreviewImageUrl,
    fallbackColor,
    repeatTile,
    accentTile,
    patternType,
  } = useDesignChatStore(
    useShallow((state) => ({
      generationStatus: state.generationStatus,
      selectedPreviewImageUrl: state.selectedPreviewImageUrl,
      fallbackColor: state.designContext.colors[0] ?? "#e5e7eb",
      repeatTile: state.repeatTile,
      accentTile: state.accentTile,
      patternType: state.patternType,
    })),
  );

  const isLoading = isActiveGeneration(generationStatus);
  const previewBackground = selectedPreviewImageUrl ?? fallbackColor;
  const isTileMode = repeatTile !== null;

  const renderContent = () => {
    if (unmasked) {
      return (
        <div
          className="h-[600px] w-[316px]"
          style={
            isTileMode
              ? tileRepeatStyle(repeatTile.url)
              : { background: previewBackground }
          }
        />
      );
    }

    if (isTileMode) {
      return (
        <div className="relative h-[600px] w-[316px]">
          <div
            className="h-full w-full"
            style={{ ...tileRepeatStyle(repeatTile.url), ...tieMaskStyle }}
          />
          {patternType === "one_point" && accentTile && (
            <div
              className="absolute left-1/2 h-[126px] w-[126px] -translate-x-1/2"
              style={{
                bottom: ACCENT_TILE_BOTTOM,
                backgroundImage: `url("${accentTile.url}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          {isLoading && <div className="animate-ai-shimmer absolute inset-0" />}
        </div>
      );
    }

    return (
      <TieMask
        imageUrl={previewBackground}
        width={316}
        height={600}
        imageClassName="transition-opacity duration-500 opacity-100"
        shadowClassName="top-[-57px]"
      >
        {isLoading && <div className="animate-ai-shimmer absolute inset-0" />}
      </TieMask>
    );
  };

  return (
    <div className="relative flex flex-col items-center">{renderContent()}</div>
  );
}
