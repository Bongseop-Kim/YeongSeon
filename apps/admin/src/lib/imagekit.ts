export const IMAGEKIT_URL_ENDPOINT =
  import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "";

export const IMAGEKIT_PUBLIC_KEY =
  import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "";

if (!IMAGEKIT_URL_ENDPOINT) {
  console.warn(
    "ImageKit URL Endpoint가 설정되지 않았습니다. VITE_IMAGEKIT_URL_ENDPOINT 환경 변수를 설정하세요."
  );
}

if (!IMAGEKIT_PUBLIC_KEY) {
  console.warn(
    "ImageKit Public Key가 설정되지 않았습니다. VITE_IMAGEKIT_PUBLIC_KEY 환경 변수를 설정하세요."
  );
}
