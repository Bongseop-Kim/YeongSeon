import { supabase } from "@/lib/supabase";

export interface ImageKitAuth {
  signature: string;
  token: string;
  expire: number;
}

export async function getImageKitAuth(): Promise<ImageKitAuth> {
  const { data, error } = await supabase.functions.invoke("imagekit-auth");

  if (error || !data) {
    throw new Error("ImageKit 인증에 실패했습니다.");
  }

  if (
    typeof data !== "object" ||
    typeof data.signature !== "string" ||
    typeof data.token !== "string" ||
    typeof data.expire !== "number"
  ) {
    throw new Error("ImageKit 인증 응답 형식이 올바르지 않습니다.");
  }

  return {
    signature: data.signature,
    token: data.token,
    expire: data.expire,
  };
}
