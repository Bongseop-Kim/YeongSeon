import {
  ProviderSkipError,
  type GenerationProvider,
  type ProviderName,
} from "@/entities/design/api/providers/provider";

export class NoProviderAvailableError extends Error {
  constructor(
    message = "NoProviderAvailable: all providers skipped or failed",
  ) {
    super(message);
    this.name = "NoProviderAvailableError";
  }
}

interface ChainResult<TResult> {
  result: TResult;
  providerUsed: ProviderName;
  usedFallback: boolean;
}

export async function runProviderChain<TRequest, TResult>(
  request: TRequest,
  chain: GenerationProvider<TRequest, TResult>[],
): Promise<ChainResult<TResult>> {
  let attempted = 0;

  for (const provider of chain) {
    if (!provider.canHandle(request)) {
      continue;
    }

    attempted += 1;

    try {
      const result = await provider.invoke(request);
      return {
        result,
        providerUsed: provider.name,
        usedFallback: attempted > 1,
      };
    } catch (error) {
      if (error instanceof ProviderSkipError) {
        continue;
      }

      throw error;
    }
  }

  throw new NoProviderAvailableError();
}
