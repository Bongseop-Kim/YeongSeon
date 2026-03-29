import { Button } from "@/shared/ui-extended/button";
import type { ReformCartItem } from "@yeongseon/shared/types/view/cart";
import CloseButton from "@/shared/ui-extended/close";
import { ReformItemInfo } from "@/shared/ui/reform-item-info";

interface ReformCartItemCardProps {
  item: ReformCartItem;
  onRemove: () => void;
  onChangeOption: () => void;
  onChangeCoupon: () => void;
}

export function ReformCartItemCard({
  item,
  onRemove,
  onChangeOption,
  onChangeCoupon,
}: ReformCartItemCardProps) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between">
        <ReformItemInfo item={item} />
        <CloseButton
          onRemove={onRemove}
          className="-mr-2 -mt-2 flex-shrink-0"
          variant="none"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          size="sm"
          onClick={onChangeOption}
        >
          옵션 변경
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          size="sm"
          onClick={onChangeCoupon}
        >
          쿠폰 사용
        </Button>
      </div>
    </div>
  );
}
