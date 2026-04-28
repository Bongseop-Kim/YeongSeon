import { useShallow } from "zustand/react/shallow";
import { isActiveGeneration } from "@/entities/design";
import { TieMask } from "@/features/design/components/preview/tie-mask";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { escapeCssUrl } from "@/shared/lib/css-url";

const TILE_BACKGROUND_SIZE = "35px 35px";
const ACCENT_TILE_SIZE = "126px";
const ACCENT_TILE_BOTTOM = "20%";
const ACCENT_TILE_BACKGROUND_SIZE = "cover";

const tileRepeatStyle = (url: string) => ({
  backgroundImage: `url("${escapeCssUrl(url)}")`,
  backgroundRepeat: "repeat" as const,
  backgroundSize: TILE_BACKGROUND_SIZE,
});

const accentOverlayStyle = (url: string) => ({
  bottom: ACCENT_TILE_BOTTOM,
  width: ACCENT_TILE_SIZE,
  height: ACCENT_TILE_SIZE,
  backgroundImage: `url("${escapeCssUrl(url)}")`,
  backgroundSize: ACCENT_TILE_BACKGROUND_SIZE,
  backgroundPosition: "center",
});

interface TieCanvasProps {
  unmasked?: boolean;
}

export function TieCanvas({ unmasked = false }: TieCanvasProps) {
  const {
    generationStatus,
    selectedPreviewImageUrl,
    selectedTilePreview,
    fallbackColor,
    repeatTile,
    accentTile,
    patternType,
  } = useDesignChatStore(
    useShallow((state) => ({
      generationStatus: state.generationStatus,
      selectedPreviewImageUrl: state.selectedPreviewImageUrl,
      selectedTilePreview: state.selectedTilePreview,
      fallbackColor: state.designContext.colors[0] ?? "#e5e7eb",
      repeatTile: state.repeatTile,
      accentTile: state.accentTile,
      patternType: state.patternType,
    })),
  );

  const isLoading = isActiveGeneration(generationStatus);
  const previewBackground = selectedPreviewImageUrl ?? fallbackColor;
  const activeRepeatTile = selectedTilePreview?.repeatTile ?? repeatTile;
  const activeAccentTile =
    selectedTilePreview !== null ? selectedTilePreview.accentTile : accentTile;
  const activePatternType = selectedTilePreview?.patternType ?? patternType;
  const renderContent = () => {
    if (unmasked) {
      return (
        <div className="relative h-[600px] w-[316px]">
          <div
            className="h-full w-full"
            style={
              activeRepeatTile !== null
                ? tileRepeatStyle(activeRepeatTile.url)
                : { background: previewBackground }
            }
          />
          {isLoading && <div className="animate-ai-shimmer absolute inset-0" />}
        </div>
      );
    }

    if (activeRepeatTile !== null) {
      return (
        <TieMask
          imageUrl={previewBackground}
          width={316}
          height={600}
          imageStyle={tileRepeatStyle(activeRepeatTile.url)}
          shadowClassName="top-[-57px]"
        >
          {activePatternType === "one_point" && activeAccentTile && (
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={accentOverlayStyle(activeAccentTile.url)}
            />
          )}
          {isLoading && <div className="animate-ai-shimmer absolute inset-0" />}
        </TieMask>
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
