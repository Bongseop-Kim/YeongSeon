import { supabase } from "@/lib/supabase";

interface AdminLoginParams {
  email: string;
  password: string;
}

export async function loginAdmin({
  email,
  password,
}: AdminLoginParams): Promise<void> {
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError) {
    throw new Error(authError.message);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !["admin", "manager"].includes(profile.role)
  ) {
    await supabase.auth.signOut();
    throw new Error("관리자 권한이 없습니다.");
  }
}
