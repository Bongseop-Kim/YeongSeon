import { supabase } from "@/shared/lib/supabase";
import type { GenerationProvider } from "@/entities/design/api/providers/provider";

export const openaiProvider: GenerationProvider = {
  name: "openai",
  canHandle() {
    return true;
  },
  async invoke({ defaultPayload }) {
    const { data, error } = await supabase.functions.invoke(
      "generate-open-api",
      {
        body: defaultPayload,
      },
    );

    if (error) {
      throw error;
    }

    return data;
  },
};
