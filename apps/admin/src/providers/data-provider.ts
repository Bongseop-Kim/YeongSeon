import { dataProvider as supabaseDataProvider } from "@refinedev/supabase";
import { supabase } from "@/lib/supabase";

export const dataProvider = supabaseDataProvider(supabase);
