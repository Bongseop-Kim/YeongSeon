import { Button } from "@/components/ui/button";
import type { UseWizardStepReturn } from "@/features/custom-order/hooks/useWizardStep";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";

interface MobileNavigationProps {
  wizard: UseWizardStepReturn;
  isQuoteMode: boolean;
  isPending: boolean;
  isSubmitDisabled: boolean;
  grandTotal: number;
  estimatedDays: string;
  isLoggedIn: boolean;
  selectedAddress: ShippingAddress | undefined;
  onNext: () => void;
  onSubmit: () => void;
}

export const MobileNavigation = ({
  wizard,
  isQuoteMode,
  isPending,
  isSubmitDisabled,
  grandTotal,
  estimatedDays,
  isLoggedIn,
  selectedAddress,
  onNext,
  onSubmit,
}: MobileNavigationProps) => {
  return (
    <div
      className="z-30 fixed bottom-0 left-0 right-0 px-4 bg-white pt-3 border-t"
      style={{
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0))",
      }}
    >
      <div className="space-y-2">
        {!wizard.isLastStep && (
          <div className="flex items-center justify-between text-sm mb-2">
            {isLoggedIn ? (
              <span className="text-zinc-900 font-medium">
                {grandTotal.toLocaleString()}원
              </span>
            ) : (
              <span className="text-zinc-500 text-xs">
                예상 기간: {estimatedDays}
              </span>
            )}
            {isLoggedIn && (
              <span className="text-zinc-500">{estimatedDays}</span>
            )}
          </div>
        )}
        {wizard.isLastStep ? (
          <div className="space-y-2">
            <Button
              type="button"
              onClick={onSubmit}
              size="xl"
              className="w-full"
              disabled={isSubmitDisabled}
            >
              {isPending
                ? isQuoteMode
                  ? "견적요청 처리 중..."
                  : "주문 처리 중..."
                : isQuoteMode
                  ? "견적요청"
                  : `${grandTotal.toLocaleString()}원 주문하기`}
            </Button>
            {!selectedAddress && (
              <p className="text-sm text-center text-zinc-500">
                배송지를 추가하면 {isQuoteMode ? "견적요청" : "주문"}을 진행할 수 있어요
              </p>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            {!wizard.isFirstStep && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={wizard.goPrev}
                className="flex-none"
              >
                이전
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              onClick={onNext}
              className="flex-1"
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
