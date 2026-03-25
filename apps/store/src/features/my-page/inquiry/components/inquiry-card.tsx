import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui-extended/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Image } from "@imagekit/react";
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
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {inquiry.category !== "일반" && (
                <Badge variant="outline" className="mb-1 text-xs">
                  {inquiry.category}
                </Badge>
              )}
              <div className="flex items-center gap-2 mb-1">
                <Label className="font-bold text-base">{inquiry.title}</Label>
                <Badge variant="secondary">{inquiry.status}</Badge>
              </div>
              <Label className="text-xs text-zinc-400">
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

          <div className="flex flex-col gap-2">
            {inquiry.product && (
              <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-md text-sm text-zinc-600">
                <Image
                  src={inquiry.product.image}
                  alt={inquiry.product.name}
                  className="w-8 h-8 object-cover rounded"
                  transformation={[{ width: 32, height: 32 }]}
                />
                <span>{inquiry.product.name}</span>
              </div>
            )}
            <Label className="text-zinc-600 text-sm whitespace-pre-line">
              {inquiry.content}
            </Label>

            {inquiry.answer && (
              <div className="mt-2 p-3 bg-zinc-50 rounded-md">
                <Label className="text-xs text-zinc-600 mb-1 block">
                  답변 ({inquiry.answerDate && formatDate(inquiry.answerDate)})
                </Label>
                <Label className="text-sm text-zinc-700 whitespace-pre-line">
                  {inquiry.answer}
                </Label>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
