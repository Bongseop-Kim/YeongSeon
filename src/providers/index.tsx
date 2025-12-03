import GlobalModal from "@/components/ui/modal";
import { BreakpointProvider } from "./breakpoint-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BreakpointProvider>
      {/* 나중에 추가될 다른 Provider들 */}
      {/* <QueryProvider client={queryClient}> */}
      {/* <ThemeProvider> */}
      {/* <ToastProvider> */}

      {children}

      {/* 전역 컴포넌트들 */}
      <GlobalModal />
      {/* <GlobalToast /> */}
      {/* <GlobalLoadingSpinner /> */}

      {/* </ToastProvider> */}
      {/* </ThemeProvider> */}
      {/* </QueryProvider> */}
    </BreakpointProvider>
  );
}
