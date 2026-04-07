type GaItem = {
  item_id: string;
  item_name: string;
  quantity?: number;
  price?: number;
};

type GaEventParamsMap = {
  page_view: { page_path: string; page_title?: string };
  view_item_list: { item_list_id?: string; item_list_name?: string };
  view_item: { item_id: string; item_name: string; price?: number };
  add_to_cart: { currency: string; value?: number; items: GaItem[] };
  remove_from_cart: { currency: string; value?: number; items: GaItem[] };
  begin_checkout: { value?: number; currency?: "KRW" };
  purchase: { transaction_id: string; value: number; currency: "KRW" };
  login: Record<string, never>;
  form_submit: { form_type: "custom_order" | "sample_order" | "reform" };
  design_chat_start: Record<string, never>;
  apply_coupon: { coupon_code?: string };
};

type GaEventName = keyof GaEventParamsMap;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function callGtag(command: string, ...args: unknown[]): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(command, ...args);
  }
}

export const analytics = {
  init(gaId: string): void {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer ?? [];
    const dl = window.dataLayer;
    window.gtag = function (...args: unknown[]) {
      dl.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", gaId, { send_page_view: false });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
  },

  pageview(path: string, title?: string): void {
    callGtag("event", "page_view", { page_path: path, page_title: title });
  },

  track<T extends GaEventName>(event: T, params: GaEventParamsMap[T]): void {
    callGtag("event", event, params);
  },
};
