import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

const KAKAO_CHANNEL_PUBLIC_ID = "_gZpqX";
const KAKAO_CHAT_URL = `https://pf.kakao.com/${KAKAO_CHANNEL_PUBLIC_ID}/chat`;

let windowOpenSpy: MockInstance;
let consoleErrorSpy: MockInstance;

beforeEach(() => {
  windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  // Kakao SDK 초기화
  delete window.Kakao;

  // 스크립트 태그 정리
  document.getElementById("kakao-javascript-sdk")?.remove();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("openKakaoChannelChat — fallback 분기", () => {
  it("VITE_KAKAO_JAVASCRIPT_KEY가 없으면 카카오 채팅 URL을 새 탭으로 열고 반환한다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "");

    const { openKakaoChannelChat } = await import("@/shared/lib/kakao-channel");

    await openKakaoChannelChat();

    expect(windowOpenSpy).toHaveBeenCalledWith(
      KAKAO_CHAT_URL,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("kakao.Channel.chat이 없으면 fallback URL을 새 탭으로 연다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "test-key");

    window.Kakao = {
      init: vi.fn(),
      isInitialized: vi.fn().mockReturnValue(true),
      // Channel 없음
    };

    const { openKakaoChannelChat } = await import("@/shared/lib/kakao-channel");

    await openKakaoChannelChat();

    expect(windowOpenSpy).toHaveBeenCalledWith(
      KAKAO_CHAT_URL,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("SDK 로드 중 throw 발생 시 console.error 후 fallback을 호출한다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "test-key");

    // window.Kakao 없음 → loadKakaoSdk() 내부 script 태그 경로
    // script.addEventListener('load',...) 대신 error 이벤트를 시뮬레이션하기 위해
    // appendChild를 throw로 대체
    vi.spyOn(document.head, "appendChild").mockImplementationOnce(() => {
      throw new Error("스크립트 로드 실패");
    });

    const { openKakaoChannelChat } = await import("@/shared/lib/kakao-channel");

    await openKakaoChannelChat();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to open Kakao channel chat",
      expect.any(Error),
    );
    expect(windowOpenSpy).toHaveBeenCalledWith(
      KAKAO_CHAT_URL,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("kakao.Channel.chat 호출 중 throw 발생 시 console.error 후 fallback을 호출한다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "test-key");

    window.Kakao = {
      init: vi.fn(),
      isInitialized: vi.fn().mockReturnValue(true),
      Channel: {
        chat: vi.fn().mockImplementationOnce(() => {
          throw new Error("chat 호출 실패");
        }),
      },
    };

    const { openKakaoChannelChat } = await import("@/shared/lib/kakao-channel");

    await openKakaoChannelChat();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to open Kakao channel chat",
      expect.any(Error),
    );
    expect(windowOpenSpy).toHaveBeenCalledWith(
      KAKAO_CHAT_URL,
      "_blank",
      "noopener,noreferrer",
    );
  });
});

describe("openKakaoChannelChat — SDK 경로", () => {
  it("window.Kakao가 이미 존재하고 isInitialized()=false이면 init 후 Channel.chat을 호출한다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "test-key");

    const initMock = vi.fn();
    const chatMock = vi.fn();

    window.Kakao = {
      init: initMock,
      isInitialized: vi.fn().mockReturnValue(false),
      Channel: { chat: chatMock },
    };

    const { openKakaoChannelChat } = await import("@/shared/lib/kakao-channel");

    await openKakaoChannelChat();

    expect(initMock).toHaveBeenCalledWith("test-key");
    expect(chatMock).toHaveBeenCalledWith({
      channelPublicId: KAKAO_CHANNEL_PUBLIC_ID,
    });
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it("window.Kakao가 이미 존재하고 isInitialized()=true이면 init 없이 Channel.chat만 호출한다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "test-key");

    const initMock = vi.fn();
    const chatMock = vi.fn();

    window.Kakao = {
      init: initMock,
      isInitialized: vi.fn().mockReturnValue(true),
      Channel: { chat: chatMock },
    };

    const { openKakaoChannelChat } = await import("@/shared/lib/kakao-channel");

    await openKakaoChannelChat();

    expect(initMock).not.toHaveBeenCalled();
    expect(chatMock).toHaveBeenCalledWith({
      channelPublicId: KAKAO_CHANNEL_PUBLIC_ID,
    });
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it("스크립트 태그가 추가되고 load 이벤트 발생 시 Channel.chat이 호출된다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "test-key");

    // window.Kakao 없음 → script 태그 주입 경로
    // vi.resetModules()로 kakaoSdkLoadPromise 캐시를 초기화한 뒤 동적 import
    vi.resetModules();

    const { openKakaoChannelChat } = await import("@/shared/lib/kakao-channel");

    const chatMock = vi.fn();

    // openKakaoChannelChat 호출 (내부에서 script 태그를 document.head에 추가)
    const chatPromise = openKakaoChannelChat();

    // script 태그가 DOM에 추가됐는지 확인 후 load 이벤트 발사
    const script = document.getElementById("kakao-javascript-sdk");
    expect(script).not.toBeNull();

    // load 이벤트 발생 직전에 window.Kakao 설정
    window.Kakao = {
      init: vi.fn(),
      isInitialized: vi.fn().mockReturnValue(true),
      Channel: { chat: chatMock },
    };

    script?.dispatchEvent(new Event("load"));

    await chatPromise;

    expect(chatMock).toHaveBeenCalledWith({
      channelPublicId: KAKAO_CHANNEL_PUBLIC_ID,
    });
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });
});
