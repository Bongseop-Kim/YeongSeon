import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OrderPurpose } from "@/features/custom-order/types/wizard";
import { Package, FlaskConical } from "lucide-react";

interface PurposeSelectorProps {
  onSelectPurpose: (purpose: OrderPurpose) => void;
}

const OPTIONS: {
  purpose: OrderPurpose;
  title: string;
  description: string;
  icon: typeof Package;
}[] = [
  {
    purpose: "order",
    title: "본 주문",
    description: "넥타이를 제작 주문합니다",
    icon: Package,
  },
  {
    purpose: "sample",
    title: "샘플 제작",
    description: "본 주문 전에 샘플을 먼저 확인합니다",
    icon: FlaskConical,
  },
];

export const PurposeSelector = ({ onSelectPurpose }: PurposeSelectorProps) => {
  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <h2 className="text-xl font-semibold text-zinc-900 text-center mb-8">
        어떤 주문을 하시겠어요?
      </h2>
      <div className="space-y-4">
        {OPTIONS.map(({ purpose, title, description, icon: Icon }) => (
          <button
            key={purpose}
            type="button"
            onClick={() => onSelectPurpose(purpose)}
            className="w-full text-left"
          >
            <Card
              className={cn(
                "transition-colors hover:border-zinc-400 cursor-pointer"
              )}
            >
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 shrink-0">
                  <Icon className="w-6 h-6 text-zinc-600" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{title}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
};
