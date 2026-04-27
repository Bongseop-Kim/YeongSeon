import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactRouterDom from "react-router-dom";
import type * as DesignFeature from "@/features/design";
import type { Attachment } from "@/features/design";
import DesignPage from "@/pages/design";
import { AUTH_REDIRECT_STORAGE_KEY } from "@/shared/lib/auth-redirect";
import { useAuthStore } from "@/shared/store/auth";
import { useModalStore } from "@/shared/store/modal";

const navigate = vi.fn();
const sendMessage = vi.fn();
const regenerate = vi.fn();
const chatPanelSpy = vi.fn();
const previewPanelSpy = vi.fn();
let isDesktop = false;

type ChatPanelProps = {
  sendMessage: (text: string, attachments: Attachment[]) => void;
};

type PreviewPanelProps = {
  onRegenerate: () => void;
};

const latestChatPanelProps = (): ChatPanelProps => {
  const props = chatPanelSpy.mock.calls.at(-1)?.[0] as
    | ChatPanelProps
    | undefined;
  expect(props).toBeDefined();
  if (!props) {
    throw new Error("ChatPanel props were not captured");
  }
  return props;
};

const latestPreviewPanelProps = (): PreviewPanelProps => {
  const props = previewPanelSpy.mock.calls.at(-1)?.[0] as
    | PreviewPanelProps
    | undefined;
  expect(props).toBeDefined();
  if (!props) {
    throw new Error("PreviewPanel props were not captured");
  }
  return props;
};

const setLoggedInUser = () => {
  useAuthStore.setState({
    user: { id: "user-1" } as ReturnType<typeof useAuthStore.getState>["user"],
    initialized: true,
  });
};

const expectLoginConfirmAndNavigate = () => {
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
};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({ isDesktop }),
}));

vi.mock("@/features/design", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignFeature>();
  return {
    ...actual,
    ChatPanel: (props: ChatPanelProps) => {
      chatPanelSpy(props);
      return <div data-testid="chat-panel" />;
    },
    MobileHistorySheet: () => null,
    OnboardingDialog: () => null,
    PendingResultBanner: () => null,
    PreviewPanel: (props: PreviewPanelProps) => {
      previewPanelSpy(props);
      return <div data-testid="preview-panel" />;
    },
    useDesignChat: () => ({
      sendMessage,
      regenerate,
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
  };
});

describe("DesignPage", () => {
  beforeEach(() => {
    navigate.mockClear();
    sendMessage.mockClear();
    regenerate.mockClear();
    chatPanelSpy.mockClear();
    previewPanelSpy.mockClear();
    isDesktop = false;
    sessionStorage.clear();
    useAuthStore.setState({ user: null, initialized: true });
    useModalStore.getState().closeModal();
  });

  it("비로그인 상태에서 채팅을 시도하면 로그인 안내 confirm을 띄우고 확인 시 로그인으로 이동한다", () => {
    render(<DesignPage />);

    expect(chatPanelSpy).toHaveBeenCalled();
    const chatProps = latestChatPanelProps();
    chatProps.sendMessage("새 디자인", []);

    expect(sendMessage).not.toHaveBeenCalled();
    expectLoginConfirmAndNavigate();
  });

  it("로그인 상태에서는 채팅 메시지를 그대로 전송한다", () => {
    setLoggedInUser();

    render(<DesignPage />);

    expect(chatPanelSpy).toHaveBeenCalled();
    const chatProps = latestChatPanelProps();
    const attachments: Attachment[] = [
      { type: "color", label: "네이비", value: "navy" },
    ];
    chatProps.sendMessage("새 디자인", attachments);

    expect(useModalStore.getState().isOpen).toBe(false);
    expect(sendMessage).toHaveBeenCalledWith("새 디자인", attachments);
  });

  it("비로그인 상태에서 재생성을 시도하면 로그인 안내 confirm을 띄운다", () => {
    isDesktop = true;

    render(<DesignPage />);

    expect(previewPanelSpy).toHaveBeenCalled();
    latestPreviewPanelProps().onRegenerate();

    expect(regenerate).not.toHaveBeenCalled();
    expectLoginConfirmAndNavigate();
  });

  it("로그인 상태에서는 재생성을 그대로 실행한다", () => {
    isDesktop = true;
    setLoggedInUser();

    render(<DesignPage />);

    latestPreviewPanelProps().onRegenerate();

    expect(useModalStore.getState().isOpen).toBe(false);
    expect(regenerate).toHaveBeenCalled();
  });
});
