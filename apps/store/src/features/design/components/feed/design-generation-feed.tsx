import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "@/shared/lib/toast";

import {
  isActiveGeneration,
  useDeleteDesignGenerationMutation,
  useDesignGenerationsQuery,
  type DesignGeneration,
  type DesignGenerationVariant,
} from "@/entities/design";
import { Button } from "@/shared/ui-extended/button";
import { toPreviewBackground } from "@/shared/lib/to-preview-background";
import { cn } from "@/shared/lib/utils";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { TiePreviewModal } from "@/features/design/components/chat/tie-preview-modal";
import { tileRepeatStyle } from "@/features/design/components/preview/tile-preview-style";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { openKakaoChannelChat } from "@/shared/lib/kakao-channel";
import { ROUTES } from "@/shared/constants/ROUTES";

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

const getVariantPreviewKey = (variant: DesignGenerationVariant): string =>
  `${variant.id}|${variant.repeatTile.url}|${variant.accentTile?.url ?? ""}`;

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
  const { isMobile } = useBreakpoint();
  const [mobilePreviewVariant, setMobilePreviewVariant] =
    useState<DesignGenerationVariant | null>(null);
  const deleteGeneration = useDeleteDesignGenerationMutation();
  const selectedPreviewImageUrl = useDesignChatStore(
    (state) => state.selectedPreviewKey,
  );
  const setSelectedTilePreview = useDesignChatStore(
    (state) => state.setSelectedTilePreview,
  );

  const handleSelectVariant = (variant: DesignGenerationVariant) => {
    const previewBackground = toPreviewBackground(variant.repeatTile.url);

    setSelectedTilePreview({
      previewKey: getVariantPreviewKey(variant),
      previewBackground,
      repeatTile: variant.repeatTile,
      accentTile: variant.accentTile,
      patternType: variant.patternType,
    });

    if (isMobile) {
      setMobilePreviewVariant(variant);
    }
  };

  const handleDelete = () => {
    deleteGeneration.mutate(generation.id, {
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "삭제하지 못했어요. 다시 시도해주세요.";
        toast.error(message);
      },
    });
  };

  return (
    <article className="border-b border-gray-100 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_170px] gap-3 max-lg:grid-cols-1">
        <div className="grid grid-cols-4 gap-2">
          {generation.variants.map((variant) => {
            const selected =
              selectedPreviewImageUrl === getVariantPreviewKey(variant);

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
              {generation.prompt}
            </p>
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
      {mobilePreviewVariant ? (
        <TiePreviewModal
          imageUrl={toPreviewBackground(mobilePreviewVariant.repeatTile.url)}
          imageStyle={tileRepeatStyle(mobilePreviewVariant.repeatTile.url)}
          repeatTileUrl={mobilePreviewVariant.repeatTile.url}
          onClose={() => setMobilePreviewVariant(null)}
        />
      ) : null}
    </article>
  );
}

export function DesignGenerationFeed({
  className,
  onReusePrompt,
}: DesignGenerationFeedProps) {
  const {
    data: generations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDesignGenerationsQuery();
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const isGenerating = isActiveGeneration(generationStatus);
  const errorMessage =
    error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.";

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
      ) : isError && !isGenerating ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-sm text-muted-foreground">
          <p>
            <span className="block font-medium text-gray-950">
              생성 기록을 불러오지 못했습니다.
            </span>
            <span className="mt-1 block">{errorMessage}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            다시 시도
          </Button>
        </div>
      ) : generations.length === 0 && !isGenerating ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-sm text-muted-foreground">
          <div className="max-w-xs space-y-1 leading-6">
            <p className="font-medium text-gray-950">
              현재 디자인 생성 서비스는 베타 서비스입니다.
            </p>
            <p>문의가 있으면 카카오톡 문의 버튼을 눌러 문의해주세요.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-brand-kakao bg-brand-kakao text-brand-ink hover:bg-brand-kakao-hover"
              onClick={() => void openKakaoChannelChat()}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              카카오톡 문의
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={ROUTES.TOKEN_PURCHASE}>토큰 충전하기</Link>
            </Button>
          </div>
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
