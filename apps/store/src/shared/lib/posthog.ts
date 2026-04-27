import posthog from "posthog-js";
import type { GenerationRoute } from "@/entities/design/model/ai-design-request";

type PosthogAiModel = "openai" | "fal";

type PhEventParamsMap = {
  design_session_started: { ai_model: PosthogAiModel };
  design_generated: {
    ai_model: PosthogAiModel;
    latency_ms: number;
    has_image: boolean;
    pipeline?: "fal-ai";
    route?: GenerationRoute;
    route_reason?: string;
    route_signals?: string[];
  };
  design_generation_failed: {
    ai_model: PosthogAiModel;
    error_type:
      | "insufficient_tokens"
      | "api_error"
      | "tile_logo_on_canvas_failed";
    pipeline?: "fal-ai";
    scale?: "large" | "medium" | "small";
    colors?: string[];
    fabric_method?: "yarn-dyed" | "print" | null;
    error?: string;
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
