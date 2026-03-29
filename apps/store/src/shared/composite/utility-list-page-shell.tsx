import type { ReactNode } from "react";
import { Empty } from "@/shared/composite/empty";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Button } from "@/shared/ui-extended/button";

interface UtilityListPageShellProps {
  isLoading: boolean;
  loadingMessage: string;
  error: unknown;
  errorTitle: string;
  children: ReactNode;
  onRetry?: () => void;
}

export function UtilityListPageShell({
  isLoading,
  loadingMessage,
  error,
  errorTitle,
  children,
  onRetry,
}: UtilityListPageShellProps) {
  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex min-h-96 items-center justify-center">
            <div className="text-zinc-500">{loadingMessage}</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-4 lg:py-8">
            <div>
              <Empty
                title={errorTitle}
                description={
                  error instanceof Error
                    ? error.message
                    : "오류가 발생했습니다."
                }
              />
              {onRetry ? (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={onRetry}>
                    다시 시도
                  </Button>
                </div>
              ) : null}
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  return <>{children}</>;
}
