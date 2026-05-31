import { useNavigate } from "react-router-dom";
import { useModalStore } from "@/shared/store/modal";
import { ROUTES } from "@/shared/constants/ROUTES";

/**
 * 로그인이 필요한 기능에서 비로그인 사용자에게 confirm 창을 띄우고,
 * 확인 시 로그인 페이지로 이동시키는 핸들러를 반환한다.
 */
export const useLoginConfirm = (): (() => void) => {
  const navigate = useNavigate();
  const confirm = useModalStore((state) => state.confirm);

  return () => {
    confirm(
      "로그인이 필요한 기능입니다. 로그인하시겠습니까?",
      () => navigate(ROUTES.LOGIN),
      { confirmText: "로그인" },
    );
  };
};
