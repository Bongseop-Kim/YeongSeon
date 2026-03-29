import { upload } from "@imagekit/react";
import { IMAGEKIT_PUBLIC_KEY } from "@/shared/lib/imagekit";
import type { TieItem } from "@yeongseon/shared/types/view/reform";
import { IMAGE_FOLDERS } from "@yeongseon/shared";
import { getImageKitAuth } from "@/entities/reform/api/reform-api";

export async function uploadTieImages(ties: TieItem[]): Promise<TieItem[]> {
  const fileTies = ties.filter((tie) => tie.image instanceof File);
  if (fileTies.length === 0) return ties;

  const { signature, token, expire } = await getImageKitAuth();

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
        folder: IMAGE_FOLDERS.REFORM,
      });

      if (!response.url) {
        throw new Error("이미지 URL을 받지 못했습니다.");
      }
      if (!response.fileId) {
        throw new Error("파일 ID를 받지 못했습니다.");
      }

      return { ...tie, image: response.url, fileId: response.fileId };
    }),
  );
}
