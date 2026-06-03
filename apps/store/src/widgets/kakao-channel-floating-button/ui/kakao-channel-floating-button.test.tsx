import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KakaoChannelFloatingButton } from "./kakao-channel-floating-button";

const KAKAO_CHAT_URL = "https://pf.kakao.com/_gZpqX/chat";

describe("KakaoChannelFloatingButton", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.innerHTML = "";
  });

  it("JavaScript 키가 없으면 카카오 채널 채팅 URL을 새 창으로 연다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "");
    const open = vi.fn();
    vi.stubGlobal("open", open);

    render(<KakaoChannelFloatingButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "카카오톡 채널 채팅하기" }),
    );

    expect(open).toHaveBeenCalledWith(
      KAKAO_CHAT_URL,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("JavaScript 키가 있으면 Kakao SDK의 채널 채팅 함수를 호출한다", async () => {
    const chat = vi.fn();
    const init = vi.fn();
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "test-javascript-key");
    window.Kakao = {
      Channel: { chat },
      init,
      isInitialized: () => false,
    };

    render(<KakaoChannelFloatingButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "카카오톡 채널 채팅하기" }),
    );

    expect(init).toHaveBeenCalledWith("test-javascript-key");
    expect(chat).toHaveBeenCalledWith({ channelPublicId: "_gZpqX" });
  });
});
