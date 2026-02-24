import type { AuthProvider } from "@refinedev/core";
import { supabase } from "@/lib/supabase";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error };
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

    if (data.user) {
      return { authenticated: true };
    }

    return { authenticated: false, redirectTo: "/login" };
  },

  getIdentity: async () => {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      return {
        id: data.user.id,
        name: data.user.email,
        email: data.user.email,
      };
    }

    return null;
  },

  onError: async (error) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return { logout: true, redirectTo: "/login" };
    }

    return { error };
  },
};
