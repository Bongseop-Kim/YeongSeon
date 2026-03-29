import { FunctionsHttpError } from "@yeongseon/supabase";

export const extractEdgeFunctionErrorMessage = async (
  error: unknown,
): Promise<string | null> => {
  if (!(error instanceof FunctionsHttpError)) {
    return null;
  }

  try {
    const payload = await error.context.json();
    if (payload && typeof payload === "object" && "error" in payload) {
      const message = payload.error;
      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
};
