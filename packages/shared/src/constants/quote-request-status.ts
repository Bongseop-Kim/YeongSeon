export type QuoteRequestStatus =
  | "요청"
  | "견적발송"
  | "협의중"
  | "확정"
  | "종료";

export const QUOTE_REQUEST_STATUS_FLOW: Record<string, string> = {
  요청: "견적발송",
  견적발송: "협의중",
  협의중: "확정",
};

export const QUOTE_REQUEST_STATUS_COLORS: Record<string, string> = {
  요청: "default",
  견적발송: "processing",
  협의중: "orange",
  확정: "success",
  종료: "error",
};

export const QUOTE_REQUEST_STATUS_OPTIONS: { label: string; value: string }[] =
  [
    { label: "요청", value: "요청" },
    { label: "견적발송", value: "견적발송" },
    { label: "협의중", value: "협의중" },
    { label: "확정", value: "확정" },
    { label: "종료", value: "종료" },
  ];

export type ContactMethod = "email" | "kakao" | "phone";

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  email: "이메일",
  kakao: "카카오톡",
  phone: "전화",
};
