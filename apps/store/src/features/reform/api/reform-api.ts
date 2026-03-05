import { supabase } from "@/lib/supabase";
import { mapImageKitAuthResponse } from "./reform-mapper";

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

  return mapImageKitAuthResponse(data);
}
