const FAL_STORAGE_INITIATE_ENDPOINT =
  "https://rest.alpha.fal.ai/storage/upload/initiate";

const decodeBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  Uint8Array.from(bytes).buffer;

export async function uploadBase64ToFalStorage(
  base64: string,
  mimeType: string,
  apiKey: string,
  fileName = `upload-${crypto.randomUUID()}`,
): Promise<{ url: string }> {
  const initiateResponse = await fetch(FAL_STORAGE_INITIATE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      content_type: mimeType,
      file_name: fileName,
    }),
  });

  if (!initiateResponse.ok) {
    const errorText = await initiateResponse.text();
    throw new Error(
      `Fal storage initiate failed: ${initiateResponse.status} ${errorText}`,
    );
  }

  const initiateData = (await initiateResponse.json()) as {
    upload_url?: string;
    file_url?: string;
  };

  if (!initiateData.upload_url || !initiateData.file_url) {
    throw new Error("Fal storage initiate did not return upload_url/file_url");
  }

  const uploadResponse = await fetch(initiateData.upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: new Blob([toArrayBuffer(decodeBase64(base64))], { type: mimeType }),
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `Fal storage upload failed: ${uploadResponse.status} ${errorText}`,
    );
  }

  return { url: initiateData.file_url };
}
