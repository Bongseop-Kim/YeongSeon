import { createSupabaseClient, type SupabaseClient } from "@yeongseon/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env file.",
    );
  }

  client ??= createSupabaseClient(supabaseUrl, supabaseAnonKey);

  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const supabaseClient = getSupabaseClient();
    const value = Reflect.get(supabaseClient, property, supabaseClient);

    return typeof value === "function" ? value.bind(supabaseClient) : value;
  },
});
