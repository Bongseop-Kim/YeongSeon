export interface ImageKitAuth {
  signature: string;
  token: string;
  expire: number;
}

function isImageKitAuth(x: unknown): x is ImageKitAuth {
  if (typeof x !== "object" || x === null) return false;
  return (
    "signature" in x &&
    typeof (x as { signature?: unknown }).signature === "string" &&
    "token" in x &&
    typeof (x as { token?: unknown }).token === "string" &&
    "expire" in x &&
    typeof (x as { expire?: unknown }).expire === "number"
  );
}

/** supabase client를 주입받아 imagekit-auth Edge Function 호출 + 검증 */
export async function getImageKitAuth(
  invoke: (name: string) => Promise<{ data: unknown; error: unknown }>,
): Promise<ImageKitAuth> {
  const { data, error } = await invoke("imagekit-auth");
  if (error || !data) throw new Error("ImageKit 인증에 실패했습니다.");
  if (!isImageKitAuth(data))
    throw new Error("ImageKit 인증 응답 형식이 올바르지 않습니다.");
  return { signature: data.signature, token: data.token, expire: data.expire };
}
