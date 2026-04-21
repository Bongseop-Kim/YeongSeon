export async function prepareControlImage(input: {
  base64: string;
  mimeType: string;
  controlType: "lineart" | "edge" | "depth";
  apiKey: string;
}): Promise<{ base64: string; mimeType: string }> {
  void input.controlType;
  void input.apiKey;

  return {
    base64: input.base64,
    mimeType: input.mimeType,
  };
}
