import { supabase } from "@/shared/lib/supabase";
import type {
  GenerationProvider,
  ProviderInvokeContext,
  ProviderName,
} from "@/entities/design/api/providers/provider";
import type { AiModel } from "@/entities/design/model/ai-design-types";

export function createSupabaseFunctionProvider(options: {
  name: ProviderName;
  functionName: string;
  aiModel: AiModel;
}): GenerationProvider<ProviderInvokeContext, unknown> {
  return {
    name: options.name,
    canHandle(context) {
      return context.request.aiModel === options.aiModel;
    },
    async invoke(context) {
      const { data, error } = await supabase.functions.invoke(
        options.functionName,
        { body: context.defaultPayload },
      );

      if (error) {
        throw error;
      }

      return data;
    },
  };
}
