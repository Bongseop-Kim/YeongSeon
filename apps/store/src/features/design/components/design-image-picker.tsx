import { useState } from "react";
import { ChevronDown, ChevronUp, ImageOff } from "lucide-react";
import type { UploadedImage } from "@/entities/custom-order";
import { useDesignImagesQuery } from "@/features/design/hooks/use-design-images-query";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui-extended/button";

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
});

interface DesignImagePickerProps {
  onAdd: (images: UploadedImage[]) => void;
}

export function DesignImagePicker({ onAdd }: DesignImagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 12;

  const { data, isLoading, isError, refetch } = useDesignImagesQuery(
    page,
    pageSize,
  );
  const images = data?.images ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds(new Set());
  };

  const toggleSelect = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const selected = images.filter((img) => selectedIds.has(img.imageFileId));
    onAdd(
      selected.map((img) => ({
        url: img.imageUrl,
        fileId: img.imageFileId,
        name: `AI 디자인 ${DATE_FORMATTER.format(new Date(img.createdAt))}`,
      })),
    );
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-50"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">내 AI 디자인에서 선택</span>
          {total > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              {total}장
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border p-4 space-y-4">
          {selectedIds.size > 0 && (
            <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
              {selectedIds.size}장 선택됨 — 추가 버튼을 누르면 참고 이미지에
              추가됩니다.
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-md bg-zinc-100"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-zinc-500">
                이미지를 불러오지 못했습니다.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs text-zinc-400 underline"
              >
                다시 시도
              </button>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ImageOff className="h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-400">
                아직 생성한 이미지가 없어요
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img) => {
                const isSelected = selectedIds.has(img.imageFileId);
                return (
                  <button
                    key={img.imageFileId}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={img.sessionFirstMessage || "AI 디자인 이미지"}
                    onClick={() => toggleSelect(img.imageFileId)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                      isSelected ? "border-zinc-900" : "border-zinc-200",
                    )}
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.sessionFirstMessage}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] text-white">
                        ✓
                      </span>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[10px] text-white">
                      {DATE_FORMATTER.format(new Date(img.createdAt))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded px-2 py-1 text-xs text-zinc-500 disabled:opacity-30 hover:bg-zinc-100"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  className={cn(
                    "rounded px-2 py-1 text-xs",
                    p === page
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:bg-zinc-100",
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded px-2 py-1 text-xs text-zinc-500 disabled:opacity-30 hover:bg-zinc-100"
              >
                다음
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleAdd}
            >
              {selectedIds.size > 0 ? `${selectedIds.size}장 추가` : "추가"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
