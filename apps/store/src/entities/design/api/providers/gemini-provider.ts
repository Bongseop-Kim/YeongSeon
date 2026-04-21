import { createSupabaseFunctionProvider } from "@/entities/design/api/providers/create-supabase-function-provider";

export const geminiProvider = createSupabaseFunctionProvider({
  name: "gemini",
  functionName: "generate-google-api",
  aiModel: "gemini",
});
