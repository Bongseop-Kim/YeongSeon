import type { AuthProvider } from "@refinedev/core";
import { supabase } from "@/lib/supabase";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      return { success: false, error: authError };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          name: "AuthorizationError",
          message: "관리자 권한이 없습니다.",
        },
      };
    }

    return { success: true, redirectTo: "/" };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error };
    }

    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      return { authenticated: false, redirectTo: "/login" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return { authenticated: false, redirectTo: "/login" };
    }

    return { authenticated: true };
  },

  getIdentity: async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      return null;
    }

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
  },

  onError: async (error) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return { logout: true, redirectTo: "/login" };
    }

    return { error };
  },
};
