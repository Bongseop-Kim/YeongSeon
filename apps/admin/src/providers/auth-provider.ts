import { loginAdmin } from "@/features/auth/api/auth-api";
import { supabase } from "@/lib/supabase";

export interface AdminIdentity {
  id: string;
  name: string | undefined;
  email: string | undefined;
  role: string | undefined;
}

export async function loginWithAdminRole(params: {
  email: string;
  password: string;
}): Promise<void> {
  await loginAdmin(params);
}

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

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const { data } = await supabase.auth.getUser();

  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", data.user.id)
    .single();

  return {
    id: data.user.id,
    name: profile?.name ?? data.user.email,
    email: data.user.email,
    role: profile?.role,
  };
}
