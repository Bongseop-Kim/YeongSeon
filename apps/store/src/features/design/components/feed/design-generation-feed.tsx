import { Download, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  isActiveGeneration,
  useDeleteDesignGenerationMutation,
  useDesignGenerationsQuery,
  type DesignGeneration,
  type DesignGenerationVariant,
} from "@/entities/design";
import { Button } from "@/shared/ui-extended/button";
import { Badge } from "@/shared/ui/badge";
import { toPreviewBackground } from "@/shared/lib/to-preview-background";
import { cn } from "@/shared/lib/utils";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

interface DesignGenerationFeedProps {
  className?: string;
  onReusePrompt: (prompt: string) => void;
}

const formatGenerationDate = (value: string): string =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const getPatternLabel = (generation: DesignGeneration): string =>
  generation.patternType === "one_point" ? "one point" : "repeat only";

const getFabricLabel = (generation: DesignGeneration): string =>
  generation.fabricType === "printed" ? "printed" : "yarn dyed";

const getPairingLabel = (generation: DesignGeneration): string | null =>
  generation.patternType === "one_point" ? "accent paired" : null;

async function downloadImage(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`download failed: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "design-tile.webp";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, "_blank");
  }
}

function GenerationTile({
  variant,
  selected,
  onSelect,
}: {
  variant: DesignGenerationVariant;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`variant ${variant.index} 선택`}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative aspect-square min-w-0 overflow-hidden rounded-md border bg-muted text-left transition-colors",
        selected
          ? "border-gray-950 ring-2 ring-gray-950/15"
          : "border-gray-200",
      )}
    >
      <img
        src={variant.repeatTile.url}
        alt=""
        className="size-full object-cover"
        draggable={false}
      />
      <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded bg-white/90 text-[11px] font-semibold text-gray-700 shadow-sm">
        {variant.index}
      </span>
      {variant.accentTile ? (
        <span className="absolute bottom-1.5 right-1.5 size-[30%] overflow-hidden rounded border border-white bg-white shadow-sm">
          <img
            src={variant.accentTile.url}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        </span>
      ) : null}
    </button>
  );
}

function GenerationRow({
  generation,
  onReusePrompt,
}: {
  generation: DesignGeneration;
  onReusePrompt: (prompt: string) => void;
}) {
  const deleteGeneration = useDeleteDesignGenerationMutation();
  const selectedPreviewImageUrl = useDesignChatStore(
    (state) => state.selectedPreviewKey,
  );
  const setSelectedTilePreview = useDesignChatStore(
    (state) => state.setSelectedTilePreview,
  );
  const variantCount = generation.variants.length;

  const handleSelectVariant = (variant: DesignGenerationVariant) => {
    setSelectedTilePreview({
      previewKey: `${variant.repeatTile.url}|${variant.accentTile?.url ?? ""}`,
      previewBackground: toPreviewBackground(variant.repeatTile.url),
      repeatTile: variant.repeatTile,
      accentTile: variant.accentTile,
      patternType: variant.patternType,
    });
  };

  const handleDelete = () => {
    deleteGeneration.mutate(generation.id, {
      onError: () => toast.error("삭제에 실패했습니다."),
    });
  };

  return (
    <article className="border-b border-gray-100 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_170px] gap-3 max-lg:grid-cols-1">
        <div className="grid grid-cols-4 gap-2">
          {generation.variants.map((variant) => {
            const selected =
              selectedPreviewImageUrl ===
              `${variant.repeatTile.url}|${variant.accentTile?.url ?? ""}`;

            return (
              <GenerationTile
                key={variant.id}
                variant={variant}
                selected={selected}
                onSelect={() => handleSelectVariant(variant)}
              />
            );
          })}
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-4 text-sm leading-6 text-gray-700">
              <span className="font-medium text-gray-950">Korean Prompt: </span>
              {generation.prompt}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary">
                {`${variantCount} ${variantCount === 1 ? "variant" : "variants"}`}
              </Badge>
              <Badge variant="secondary">{getPatternLabel(generation)}</Badge>
              <Badge variant="secondary">{getFabricLabel(generation)}</Badge>
              {getPairingLabel(generation) ? (
                <Badge variant="secondary">{getPairingLabel(generation)}</Badge>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              title="프롬프트 재사용"
              aria-label="프롬프트 재사용"
              onClick={() => onReusePrompt(generation.prompt)}
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              title="대표 타일 다운로드"
              aria-label="대표 타일 다운로드"
              onClick={() => {
                const firstVariant = generation.variants[0];
                if (firstVariant)
                  void downloadImage(firstVariant.repeatTile.url);
              }}
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 text-gray-500 hover:text-gray-950"
              title="삭제"
              aria-label="삭제"
              disabled={deleteGeneration.isPending}
              onClick={handleDelete}
            >
              {deleteGeneration.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function DesignGenerationFeed({
  className,
  onReusePrompt,
}: DesignGenerationFeedProps) {
  const { data: generations = [], isLoading } = useDesignGenerationsQuery();
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const isGenerating = isActiveGeneration(generationStatus);

  return (
    <div className={cn("min-h-0 overflow-y-auto px-4", className)}>
      {isGenerating ? (
        <div className="border-b border-gray-100 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_168px] gap-4 max-lg:grid-cols-1">
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-md bg-gray-100"
                />
              ))}
            </div>
            <div className="space-y-2 py-1">
              <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
      ) : null}
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          생성 기록을 불러오는 중입니다.
        </div>
      ) : generations.length === 0 && !isGenerating ? (
        <div className="flex h-full items-center justify-center px-8 text-center text-sm text-muted-foreground">
          하단 입력창에서 첫 디자인을 생성하면 결과가 여기에 표시됩니다.
        </div>
      ) : (
        generations.map((generation, index) => (
          <div key={generation.id}>
            {index === 0 ||
            formatGenerationDate(generations[index - 1]?.createdAt ?? "") !==
              formatGenerationDate(generation.createdAt) ? (
              <div className="pt-3 text-sm font-semibold text-gray-700">
                {formatGenerationDate(generation.createdAt)}
              </div>
            ) : null}
            <GenerationRow
              generation={generation}
              onReusePrompt={onReusePrompt}
            />
          </div>
        ))
      )}
    </div>
  );
}
