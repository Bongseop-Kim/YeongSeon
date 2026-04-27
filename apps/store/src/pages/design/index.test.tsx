import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactRouterDom from "react-router-dom";
import type { Attachment } from "@/features/design";
import DesignPage from "@/pages/design";
import { AUTH_REDIRECT_STORAGE_KEY } from "@/shared/lib/auth-redirect";
import { useAuthStore } from "@/shared/store/auth";
import { useModalStore } from "@/shared/store/modal";

const navigate = vi.fn();
const sendMessage = vi.fn();
const chatPanelSpy = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({ isDesktop: false }),
}));

vi.mock("@/features/design", () => ({
  ChatPanel: (props: {
    sendMessage: (text: string, attachments: Attachment[]) => void;
  }) => {
    chatPanelSpy(props);
    return <div data-testid="chat-panel" />;
  },
  MobileHistorySheet: () => null,
  OnboardingDialog: () => null,
  PendingResultBanner: () => null,
  PreviewPanel: () => null,
  useDesignChat: () => ({
    sendMessage,
    regenerate: vi.fn(),
  }),
  useOnboarding: () => ({
    showOnboarding: false,
    completeOnboarding: vi.fn(),
  }),
  usePendingGeneration: () => ({
    hasPendingResult: false,
    markPending: vi.fn(),
    clearPending: vi.fn(),
  }),
  useSessionRestore: () => ({
    isHistoryOpen: false,
    openHistory: vi.fn(),
    closeHistory: vi.fn(),
    restoreSession: vi.fn(),
  }),
}));

describe("DesignPage", () => {
  beforeEach(() => {
    navigate.mockClear();
    sendMessage.mockClear();
    chatPanelSpy.mockClear();
    sessionStorage.clear();
    useAuthStore.setState({ user: null, initialized: true });
    useModalStore.getState().closeModal();
  });

  it("비로그인 상태에서 채팅을 시도하면 로그인 안내 confirm을 띄우고 확인 시 로그인으로 이동한다", () => {
    render(<DesignPage />);

    const chatProps = chatPanelSpy.mock.calls.at(-1)?.[0];
    chatProps.sendMessage("새 디자인", []);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(useModalStore.getState()).toMatchObject({
      isOpen: true,
      description: "로그인 후 이용 가능합니다. 로그인으로 이동하시겠습니까?",
      confirmText: "로그인",
      cancelText: "취소",
    });

    useModalStore.getState().onConfirm?.();

    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe("/design");
    expect(navigate).toHaveBeenCalledWith("/login", {
      state: { from: "/design" },
    });
  });

  it("로그인 상태에서는 채팅 메시지를 그대로 전송한다", () => {
    useAuthStore.setState({
      user: { id: "user-1" } as ReturnType<
        typeof useAuthStore.getState
      >["user"],
      initialized: true,
    });

    render(<DesignPage />);

    const chatProps = chatPanelSpy.mock.calls.at(-1)?.[0];
    const attachments: Attachment[] = [
      { type: "color", label: "네이비", value: "navy" },
    ];
    chatProps.sendMessage("새 디자인", attachments);

    expect(useModalStore.getState().isOpen).toBe(false);
    expect(sendMessage).toHaveBeenCalledWith("새 디자인", attachments);
  });
});
