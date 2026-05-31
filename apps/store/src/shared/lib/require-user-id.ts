import { supabase } from "@/shared/lib/supabase";

export const requireUserId = async (): Promise<string> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인 후 이용할 수 있어요.");
  }

  return user.id;
};
