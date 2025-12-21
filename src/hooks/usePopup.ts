import { useCallback, useState } from "react";

type PopupOptions = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  scrollbars?: boolean;
  resizable?: boolean;
};

const buildFeatures = (opt: PopupOptions) => {
  const {
    width = 430,
    height = 650,
    left = 200,
    top = 100,
    scrollbars = true,
    resizable = false,
  } = opt;

  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    `scrollbars=${scrollbars ? "yes" : "no"}`,
    `resizable=${resizable ? "yes" : "no"}`,
  ].join(",");
};

export const usePopup = () => {
  const [popup, setPopup] = useState<Window | null>(null);

  const openPopup = useCallback(
    (url: string, name = "popup", opt: PopupOptions = {}) => {
      const win = window.open(url, name, buildFeatures(opt));
      setPopup(win);
      return win;
    },
    []
  );

  const closePopup = useCallback(() => {
    popup?.close();
    setPopup(null);
  }, [popup]);

  return { popup, openPopup, closePopup };
};

export const usePopupChild = () => {
  const postMessageAndClose = useCallback((message: any) => {
    window.opener?.postMessage(message, "*");
    window.close();
  }, []);

  return { postMessageAndClose };
};
