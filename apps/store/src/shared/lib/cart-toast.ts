import { ROUTES } from "@/shared/constants/ROUTES";
import { toast } from "@/shared/lib/toast";

export const showCartAddedToast = (message: string) => {
  return toast.success(message, {
    action: {
      label: "장바구니 보기",
      onClick: () => {
        window.location.href = ROUTES.CART;
      },
    },
  });
};
