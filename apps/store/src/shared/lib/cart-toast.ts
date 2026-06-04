import { ROUTES } from "@/shared/constants/ROUTES";
import { toast } from "@/shared/lib/toast";

export const NAVIGATE_TO_CART_EVENT = "navigate-to-cart";

export const showCartAddedToast = (message: string) => {
  return toast.success(message, {
    action: {
      label: "장바구니 보기",
      onClick: () => {
        window.dispatchEvent(
          new CustomEvent(NAVIGATE_TO_CART_EVENT, { detail: ROUTES.CART }),
        );
      },
    },
  });
};
