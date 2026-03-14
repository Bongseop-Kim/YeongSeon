export type SupportedProvider = "kakao" | "google";
export type ProviderId = SupportedProvider | "naver" | "apple";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  supported: boolean;
  variant?: "default" | "outline";
  className: string;
  icon: React.ReactNode;
}

export function isSupportedProvider(id: ProviderId): id is SupportedProvider {
  return id === "kakao" || id === "google";
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "kakao",
    label: "카카오로 시작하기",
    supported: true,
    className:
      "w-full h-12 bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90 font-medium",
    icon: (
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
      </svg>
    ),
  },
  {
    id: "google",
    label: "구글로 시작하기",
    supported: true,
    variant: "outline",
    className: "w-full h-12 font-medium",
    icon: (
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  {
    id: "naver",
    label: "네이버로 시작하기",
    supported: false,
    className: "w-full h-12 bg-[#03C75A] text-white font-medium",
    icon: (
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple로 시작하기",
    supported: false,
    variant: "outline",
    className: "w-full h-12 font-medium",
    icon: (
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
];
