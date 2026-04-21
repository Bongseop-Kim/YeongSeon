import type {
  AiDesignRequest,
  GenerationRoute,
} from "@/entities/design/model/ai-design-request";

export type ProviderName = "fal" | "openai" | "gemini";

export class ProviderSkipError extends Error {
  constructor(
    public readonly providerName: ProviderName,
    message: string,
  ) {
    super(message);
    this.name = "ProviderSkipError";
  }
}

export interface ProviderInvokeContext {
  request: AiDesignRequest;
  defaultPayload: Record<string, unknown>;
  falPayload: Record<string, unknown>;
  resolvedRoute: GenerationRoute;
  canUseFalApi: boolean;
}

export interface GenerationProvider<
  TRequest = ProviderInvokeContext,
  TResult = unknown,
> {
  readonly name: ProviderName;
  canHandle(request: TRequest): boolean;
  invoke(request: TRequest): Promise<TResult>;
}
