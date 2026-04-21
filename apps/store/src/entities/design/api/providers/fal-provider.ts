import { supabase } from "@/shared/lib/supabase";
import {
  ProviderSkipError,
  type GenerationProvider,
  type ProviderInvokeContext,
} from "@/entities/design/api/providers/provider";

const getErrorCode = async (error: unknown): Promise<string | null> => {
  const response = (error as { context?: unknown } | null)?.context;
  if (!(response instanceof Response)) {
    return null;
  }

  try {
    const body = (await response.clone().json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
};

export const falProvider: GenerationProvider<ProviderInvokeContext, unknown> = {
  name: "fal",
  canHandle(context) {
    return context.canUseFalApi;
  },
  async invoke(context) {
    const { data, error } = await supabase.functions.invoke(
      "generate-fal-api",
      {
        body: context.falPayload,
      },
    );

    if (error) {
      const errorCode = await getErrorCode(error);
      if (errorCode === "fal_pipeline_disabled") {
        throw new ProviderSkipError("fal", "fal_pipeline_disabled");
      }

      throw error;
    }

    return data;
  },
};
