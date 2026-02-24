import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  initialized: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  initialized: false,
}));
