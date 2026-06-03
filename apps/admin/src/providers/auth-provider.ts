import { supabase } from "@/lib/supabase";

export async function logoutAdmin(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function checkAdminAuth(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();

  if (!data.user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return Boolean(profile && ["admin", "manager"].includes(profile.role));
}
