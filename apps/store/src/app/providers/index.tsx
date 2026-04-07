import GlobalModal from "@/shared/ui-extended/modal";
import { Toaster } from "@/shared/ui/sonner";
import { BreakpointProvider } from "@/shared/lib/breakpoint-provider";
import { ScrollToTop } from "./scroll-to-top";
import { QueryProvider } from "./query-provider";
import { AuthSyncProvider } from "./auth-sync-provider";
import { CartSyncProvider } from "./cart-sync-provider";
import { ImageKitProvider } from "@imagekit/react";
import { IMAGEKIT_URL_ENDPOINT } from "@/shared/lib/imagekit";
import { HelmetProvider } from "react-helmet-async";
// import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Zustand store는 기존 코드 호환성을 위해 유지
  // 실제 세션 관리는 TanStack Query와 AuthSyncProvider에서 처리
  // Supabase는 자동으로 토큰 갱신을 처리합니다 (autoRefreshToken 기본 활성화)
  // Cart 동기화는 CartSyncProvider에서 userId 변화만 감지하여 처리

  return (
    <HelmetProvider>
      <QueryProvider>
        <AuthSyncProvider>
          <CartSyncProvider>
            <BreakpointProvider>
              <ImageKitProvider urlEndpoint={IMAGEKIT_URL_ENDPOINT}>
                {/* <ThemeProvider> */}

                <ScrollToTop />
                {children}

                {/* 전역 컴포넌트들 */}
                <GlobalModal />
                <Toaster />
                {/* <GlobalLoadingSpinner /> */}

                {/* </ThemeProvider> */}
              </ImageKitProvider>
            </BreakpointProvider>
          </CartSyncProvider>
        </AuthSyncProvider>
      </QueryProvider>
    </HelmetProvider>
  );
}
