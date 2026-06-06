import { supabase } from "@/shared/lib/supabase";

interface RegisterRepairShippingPhotosParams {
  url: string;
  fileId: string;
}

export async function registerRepairShippingPhotosRpc({
  url,
  fileId,
}: RegisterRepairShippingPhotosParams): Promise<void> {
  const { error } = await supabase.rpc("register_repair_shipping_upload", {
    p_url: url,
    p_file_id: fileId,
  });

  if (error) {
    throw new Error(`발송 사진 등록에 실패했습니다: ${error.message}`);
  }
}
