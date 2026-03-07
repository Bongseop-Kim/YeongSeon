import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { Conversation } from "@/features/design/types/chat";

interface HistoryPanelProps {
  open: boolean;
  conversations: Conversation[];
  onSelect: (conv: Conversation) => void;
  onDelete: (conversationId: string) => void;
  onClose: () => void;
}

export function HistoryPanel({
  open,
  conversations,
  onSelect,
  onDelete,
  onClose,
}: HistoryPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>대화 이력</SheetTitle>
        </SheetHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-500">이전 대화가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="relative">
                  <button
                    type="button"
                    className="w-full rounded-lg border p-3 pr-12 text-left transition-colors hover:bg-gray-50"
                    onClick={() => {
                      onSelect(conversation);
                      onClose();
                    }}
                  >
                    <p className="truncate text-sm font-medium">{conversation.title}</p>
                    <p className="mt-1 truncate text-sm text-gray-500">
                      {conversation.lastMessage}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Intl.DateTimeFormat("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(conversation.updatedAt))}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conversation.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
