import { upload } from "@imagekit/react";
import { supabase } from "@/lib/supabase";
import { IMAGEKIT_PUBLIC_KEY } from "@/lib/imagekit";
import type { TieItem } from "@yeongseon/shared/types/view/reform";

/**
 * TieItem 배열의 File 이미지를 ImageKit에 업로드하고 URL 문자열로 교체
 */
export async function uploadTieImages(ties: TieItem[]): Promise<TieItem[]> {
  const fileTies = ties.filter((tie) => tie.image instanceof File);
  if (fileTies.length === 0) return ties;

  // 인증을 한 번만 호출하여 모든 업로드에 공유
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

  const { signature, token, expire } = data as {
    signature: string;
    token: string;
    expire: number;
  };

  return Promise.all(
    ties.map(async (tie) => {
      if (!(tie.image instanceof File)) {
        return tie;
      }

      const response = await upload({
        file: tie.image,
        fileName: tie.image.name,
        signature,
        token,
        expire,
        publicKey: IMAGEKIT_PUBLIC_KEY,
        folder: "/reform",
      });

      if (!response.url) {
        throw new Error("이미지 URL을 받지 못했습니다.");
      }

      return { ...tie, image: response.url };
    })
  );
}
