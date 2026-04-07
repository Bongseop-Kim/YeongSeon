import { useEffect } from "react";
import { ph } from "@/shared/lib/posthog";
import { supabase } from "@/shared/lib/supabase";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://app.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    ph.init(POSTHOG_KEY, POSTHOG_HOST);

    const handleError = (event: ErrorEvent) => {
      ph.captureException(event.message, {
        filename: event.filename,
        lineno: event.lineno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      ph.captureException(String(event.reason));
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // AuthSyncProvider와 별도로 구독 — analytics 목적 분리
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        ph.identify(session.user.id, {
          email: session.user.email,
          created_at: session.user.created_at,
        });
      } else if (event === "SIGNED_OUT") {
        ph.reset();
      }
    });

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
