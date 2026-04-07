import posthog from "posthog-js";

type AiModel = "openai" | "gemini";

type PhEventParamsMap = {
  design_session_started: { ai_model: AiModel };
  design_generated: {
    ai_model: AiModel;
    latency_ms: number;
    has_image: boolean;
  };
  design_generation_failed: {
    ai_model: AiModel;
    error_type: "insufficient_tokens" | "api_error";
  };
  order_completed: { order_id: string; amount: number };
  token_purchased: {
    order_id: string;
    token_amount: number;
    amount: number;
  };
  product_viewed: { product_id: string; product_name: string };
};

type PhEventName = keyof PhEventParamsMap;

export const ph = {
  init(key: string, host: string): void {
    posthog.init(key, {
      api_host: host,
      autocapture: false,
      capture_pageview: false,
    });
  },

  capture<T extends PhEventName>(event: T, params: PhEventParamsMap[T]): void {
    posthog.capture(event, params);
  },

  identify(
    uid: string,
    properties: { email?: string; created_at?: string },
  ): void {
    posthog.identify(uid, properties);
  },

  reset(): void {
    posthog.reset();
  },

  captureException(message: string, extra?: Record<string, unknown>): void {
    posthog.capture("$exception", { ...extra, message });
  },
};
