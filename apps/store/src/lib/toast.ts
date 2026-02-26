import { toast as sonnerToast, type ExternalToast } from "sonner";

/**
 * Toast 타입 정의
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * 에러 타입 정의
 */
export interface AppError {
  message: string;
  code?: string;
  type?: ToastType;
}

/**
 * 에러 메시지 매핑
 */
const ERROR_MESSAGES: Record<string, string> = {
  // 인증 관련
  "auth/kakao-failed": "카카오 로그인에 실패했습니다.",
  "auth/google-failed": "구글 로그인에 실패했습니다.",
  "auth/signout-failed": "로그아웃에 실패했습니다.",
  "auth/unauthorized": "인증이 필요합니다.",

  // 주문 관련
  "order/option-required": "옵션을 선택해주세요.",
  "order/complete": "주문이 완료되었습니다!",
  "order/coupon-applied": "쿠폰이 적용되었습니다.",
  "order/coupon-cancelled": "쿠폰 사용을 취소했습니다.",

  // 클레임 관련
  "claim/complete": "신청이 완료되었습니다.",

  // 일반
  "common/unknown-error": "알 수 없는 오류가 발생했습니다.",
};

/**
 * 에러를 사용자 친화적인 메시지로 변환
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // AppError의 code 속성이 있는 경우 우선적으로 사용
    if ("code" in error && typeof error.code === "string" && error.code) {
      if (ERROR_MESSAGES[error.code]) {
        return ERROR_MESSAGES[error.code];
      }
    }
    // code가 없거나 매핑되지 않은 경우 message로 폴백
    if (error.message && ERROR_MESSAGES[error.message]) {
      return ERROR_MESSAGES[error.message];
    }
    return error.message;
  }

  if (typeof error === "string") {
    if (ERROR_MESSAGES[error]) {
      return ERROR_MESSAGES[error];
    }
    return error;
  }

  return ERROR_MESSAGES["common/unknown-error"];
};

/**
 * Toast 헬퍼 함수들
 */
export const toast = {
  /**
   * 성공 메시지 표시
   */
  success: (
    message: string,
    options?: Parameters<typeof sonnerToast.success>[1]
  ) => {
    return sonnerToast.success(message, {
      duration: 3000,
      ...options,
    });
  },

  /**
   * 에러 메시지 표시
   */
  error: (
    message: string | unknown,
    options?: Parameters<typeof sonnerToast.error>[1]
  ) => {
    const errorMessage =
      typeof message === "string" ? message : getErrorMessage(message);
    return sonnerToast.error(errorMessage, {
      duration: 4000,
      ...options,
    });
  },

  /**
   * 경고 메시지 표시
   */
  warning: (
    message: string,
    options?: Parameters<typeof sonnerToast.warning>[1]
  ) => {
    return sonnerToast.warning(message, {
      duration: 3500,
      ...options,
    });
  },

  /**
   * 정보 메시지 표시
   */
  info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
    return sonnerToast.info(message, {
      duration: 3000,
      ...options,
    });
  },

  /**
   * 로딩 메시지 표시
   */
  loading: (
    message: string,
    options?: Parameters<typeof sonnerToast.loading>[1]
  ) => {
    return sonnerToast.loading(message, options);
  },

  /**
   * Promise 기반 Toast (로딩 → 성공/실패)
   */
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    data: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, data);
  },

  /**
   * 특정 토스트 또는 모든 토스트 닫기
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};
