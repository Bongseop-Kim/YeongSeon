import { upload } from "@imagekit/react";
import { getImageKitAuth, IMAGEKIT_PUBLIC_KEY } from "@/shared/lib/imagekit";
import { supabase } from "@/shared/lib/supabase";
import { IMAGE_FOLDERS } from "@yeongseon/shared";
import type { RepairShippingPhoto } from "@/shared/store/order";

/**
 * 수선품 발송 사진(File)을 ImageKit에 업로드하고 images 테이블에 등록한다.
 * 반환된 {url, fileId}는 submit_repair_tracking / submit_repair_no_tracking
 * RPC에 전달되어 주문에 연결된다.
 */
export async function uploadRepairShippingPhotos(
  files: File[],
): Promise<RepairShippingPhoto[]> {
  if (files.length === 0) return [];

  const photos: RepairShippingPhoto[] = [];

  // ImageKit 업로드 토큰은 1회용이므로 파일마다 인증을 발급받는다
  for (const file of files) {
    const { signature, token, expire } = await getImageKitAuth();

    const response = await upload({
      file,
      fileName: file.name,
      signature,
      token,
      expire,
      publicKey: IMAGEKIT_PUBLIC_KEY,
      folder: IMAGE_FOLDERS.REPAIR_SHIPPING,
    });

    if (!response.url) {
      throw new Error("이미지 URL을 받지 못했습니다.");
    }
    if (!response.fileId) {
      throw new Error("파일 ID를 받지 못했습니다.");
    }

    const { error } = await supabase.rpc("register_repair_shipping_upload", {
      p_url: response.url,
      p_file_id: response.fileId,
    });
    if (error) {
      throw new Error(`발송 사진 등록에 실패했습니다: ${error.message}`);
    }

    photos.push({ url: response.url, fileId: response.fileId });
  }

  return photos;
}
