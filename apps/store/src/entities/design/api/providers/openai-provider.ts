import { createSupabaseFunctionProvider } from "@/entities/design/api/providers/create-supabase-function-provider";

export const openaiProvider = createSupabaseFunctionProvider({
  name: "openai",
  functionName: "generate-open-api",
  aiModel: "openai",
});
