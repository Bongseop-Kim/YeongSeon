const KAKAO_CHANNEL_PUBLIC_ID = "_gZpqX";
const KAKAO_CHAT_URL = `https://pf.kakao.com/${KAKAO_CHANNEL_PUBLIC_ID}/chat`;
const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const KAKAO_SDK_SCRIPT_ID = "kakao-javascript-sdk";
const KAKAO_SDK_LOAD_TIMEOUT_MS = 5000;

type KakaoChannel = {
  chat: (options: { channelPublicId: string }) => void;
};

type KakaoSdk = {
  Channel?: KakaoChannel;
  init: (javascriptKey: string) => void;
  isInitialized: () => boolean;
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let kakaoSdkLoadPromise: Promise<KakaoSdk | null> | null = null;

function getKakaoJavascriptKey() {
  return import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
}

function openKakaoChannelChatFallback() {
  window.open(KAKAO_CHAT_URL, "_blank", "noopener,noreferrer");
}

function loadKakaoSdk() {
  if (typeof window === "undefined") {
    return Promise.resolve<KakaoSdk | null>(null);
  }

  if (window.Kakao) {
    return Promise.resolve(window.Kakao);
  }

  if (kakaoSdkLoadPromise) {
    return kakaoSdkLoadPromise;
  }

  kakaoSdkLoadPromise = new Promise<KakaoSdk | null>((resolve) => {
    const existingScript = document.getElementById(KAKAO_SDK_SCRIPT_ID);
    let script: HTMLScriptElement | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      existingScript?.removeEventListener("load", handleLoad);
      existingScript?.removeEventListener("error", handleError);
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };

    const finish = (kakao: KakaoSdk | null, shouldResetCache = false) => {
      if (settled) return;

      settled = true;
      cleanup();
      if (shouldResetCache) {
        kakaoSdkLoadPromise = null;
      }
      resolve(kakao);
    };

    const handleLoad = () => finish(window.Kakao ?? null, !window.Kakao);
    const handleError = () => finish(null, true);

    timeout = setTimeout(
      () => finish(window.Kakao ?? null, !window.Kakao),
      KAKAO_SDK_LOAD_TIMEOUT_MS,
    );

    if (existingScript) {
      if (
        "readyState" in existingScript &&
        existingScript.readyState === "complete"
      ) {
        finish(window.Kakao ?? null, !window.Kakao);
        return;
      }

      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    script = document.createElement("script");
    script.id = KAKAO_SDK_SCRIPT_ID;
    script.src = KAKAO_SDK_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    document.head.appendChild(script);
  });

  return kakaoSdkLoadPromise;
}

export async function openKakaoChannelChat() {
  const javascriptKey = getKakaoJavascriptKey();

  if (!javascriptKey) {
    openKakaoChannelChatFallback();
    return;
  }

  try {
    const kakao = await loadKakaoSdk();

    if (!kakao?.Channel?.chat) {
      openKakaoChannelChatFallback();
      return;
    }

    if (!kakao.isInitialized()) {
      kakao.init(javascriptKey);
    }

    kakao.Channel.chat({
      channelPublicId: KAKAO_CHANNEL_PUBLIC_ID,
    });
  } catch (error) {
    console.error("Failed to open Kakao channel chat", error);
    openKakaoChannelChatFallback();
  }
}
