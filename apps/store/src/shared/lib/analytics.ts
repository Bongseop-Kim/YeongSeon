type GaEventName =
  | "page_view"
  | "view_item_list"
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "login"
  | "form_submit"
  | "design_chat_start"
  | "apply_coupon";

type GaEventParamsMap = {
  page_view: { page_path: string; page_title?: string };
  view_item_list: { item_list_id?: string; item_list_name?: string };
  view_item: { item_id: string; item_name: string; price?: number };
  add_to_cart: {
    item_id: string;
    item_name: string;
    quantity: number;
    price?: number;
  };
  remove_from_cart: { item_id: string; item_name: string; quantity: number };
  begin_checkout: { value?: number; currency?: "KRW" };
  purchase: { transaction_id: string; value: number; currency: "KRW" };
  login: Record<string, never>;
  form_submit: { form_type: "custom_order" | "sample_order" | "reform" };
  design_chat_start: Record<string, never>;
  apply_coupon: { coupon_code?: string };
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function callGtag(command: string, ...args: unknown[]): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(command, ...args);
  }
}

export const analytics = {
  pageview(path: string, title?: string): void {
    callGtag("event", "page_view", { page_path: path, page_title: title });
  },

  track<T extends GaEventName>(event: T, params: GaEventParamsMap[T]): void {
    callGtag("event", event, params);
  },
};
