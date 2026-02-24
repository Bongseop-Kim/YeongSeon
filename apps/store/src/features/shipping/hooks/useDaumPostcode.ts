import { useEffect, useState } from "react";

declare global {
  interface Window {
    daum: {
      Postcode: new (config: DaumPostcodeConfig) => DaumPostcodeInstance;
    };
  }
}

export interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName?: string;
}

interface DaumPostcodeConfig {
  oncomplete: (data: DaumPostcodeData) => void;
  onclose?: () => void;
  width?: string | number;
  height?: string | number;
}

interface DaumPostcodeInstance {
  embed: (element: HTMLElement) => void;
  open: () => void;
}

export const useDaumPostcode = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.daum?.Postcode) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error("Daum Postcode API 스크립트 로딩에 실패했습니다.");
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return { isLoaded };
};
