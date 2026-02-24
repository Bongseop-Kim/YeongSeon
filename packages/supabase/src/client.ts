import { createClient } from "@supabase/supabase-js";

export const createSupabaseClient = (url: string, anonKey: string) =>
  createClient(url, anonKey);

export type {
  SupabaseClient,
  User,
  Session,
  AuthChangeEvent,
} from "@supabase/supabase-js";
