import { Sheet, SheetContent, SheetTitle } from "@/shared/ui-extended/sheet";
import { HistoryTab } from "@/features/design/components/history/history-tab";
import type { DesignSession } from "@/features/design/types/session";

interface MobileHistorySheetProps {
  open: boolean;
  onClose: () => void;
  onSessionSelect: (session: DesignSession) => void;
}

export function MobileHistorySheet({
  open,
  onClose,
  onSessionSelect,
}: MobileHistorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="flex h-[50vh] flex-col">
        <SheetTitle className="sr-only">디자인 히스토리</SheetTitle>
        <div className="h-full flex-1 overflow-hidden">
          <HistoryTab onSessionSelect={onSessionSelect} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
