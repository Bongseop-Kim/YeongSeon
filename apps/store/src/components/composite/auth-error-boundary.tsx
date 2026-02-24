import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 인증 관련 에러를 처리하는 Error Boundary
 * 인증 오류 발생 시 사용자에게 친화적인 에러 화면을 표시합니다.
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 다음 렌더에서 fallback UI가 보이도록 상태를 업데이트합니다.
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 리포팅 서비스에 에러를 기록할 수 있습니다.
    console.error("AuthErrorBoundary에서 에러를 잡았습니다:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 제공되면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <ErrorFallback error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}

/**
 * 에러 발생 시 표시되는 기본 Fallback UI
 * Error Boundary는 Router 밖에서도 동작할 수 있으므로 window.location을 사용합니다.
 */
function ErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  // 인증 관련 에러인지 확인
  const isAuthError =
    error?.message.includes("인증") ||
    error?.message.includes("세션") ||
    error?.message.includes("토큰") ||
    error?.message.includes("로그인") ||
    error?.message.includes("auth") ||
    error?.message.includes("session") ||
    error?.message.includes("token") ||
    error?.name === "AuthError" ||
    error?.name === "SessionError";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isAuthError ? "인증 오류가 발생했습니다" : "오류가 발생했습니다"}
          </h1>
          <p className="text-gray-600 mb-4">
            {isAuthError
              ? "세션이 만료되었거나 인증에 문제가 있습니다. 다시 로그인해주세요."
              : "예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요."}
          </p>
          {process.env.NODE_ENV === "development" && error && (
            <details className="mt-4 text-left">
              <summary className="text-sm text-gray-500 cursor-pointer mb-2">
                에러 상세 정보 (개발 모드)
              </summary>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                {error.toString()}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>

        <div className="space-y-3">
          {isAuthError ? (
            <Button
              onClick={() => {
                onReset();
                window.location.href = ROUTES.LOGIN;
              }}
              className="w-full"
            >
              로그인 페이지로 이동
            </Button>
          ) : (
            <>
              <Button onClick={onReset} className="w-full">
                다시 시도
              </Button>
              <Button
                onClick={() => {
                  window.location.href = ROUTES.HOME;
                }}
                variant="outline"
                className="w-full"
              >
                홈으로 이동
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
