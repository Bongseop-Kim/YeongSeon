import { Image } from "@imagekit/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui-extended/button";
import { Label } from "@/components/ui/label";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import {
  INQUIRY_STATUS,
  type InquiryItem,
} from "@/features/my-page/inquiry/types/inquiry-item";

interface InquiryCardProps {
  inquiry: InquiryItem;
  isMutating: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InquiryCard({
  inquiry,
  isMutating,
  onEdit,
  onDelete,
}: InquiryCardProps) {
  return (
    <article className="border-b border-stone-200 px-4 py-5 lg:px-0">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {inquiry.category !== "일반" && (
                <Badge variant="outline" className="text-xs">
                  {inquiry.category}
                </Badge>
              )}
              <Badge variant="secondary">{inquiry.status}</Badge>
            </div>
            <Label className="text-base font-bold">{inquiry.title}</Label>
            <Label className="mt-1 block text-xs text-zinc-400">
              {formatDate(inquiry.date)}
            </Label>
          </div>

          {inquiry.status === INQUIRY_STATUS.PENDING && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onEdit(inquiry.id)}
              >
                수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onDelete(inquiry.id)}
              >
                삭제
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {inquiry.product && (
            <div className="flex items-center gap-2 border-l-2 border-stone-200 pl-3 text-sm text-zinc-600">
              <Image
                src={inquiry.product.image}
                alt={inquiry.product.name}
                className="h-8 w-8 rounded object-cover"
                transformation={[{ width: 32, height: 32 }]}
              />
              <span>{inquiry.product.name}</span>
            </div>
          )}
          <Label className="whitespace-pre-line text-sm text-zinc-600">
            {inquiry.content}
          </Label>

          {inquiry.answer && (
            <div className="border-l-2 border-stone-300 bg-stone-50/70 px-4 py-3">
              <Label className="mb-1 block text-xs text-zinc-600">
                {inquiry.answerDate
                  ? `답변 (${formatDate(inquiry.answerDate)})`
                  : "답변"}
              </Label>
              <Label className="whitespace-pre-line text-sm text-zinc-700">
                {inquiry.answer}
              </Label>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
