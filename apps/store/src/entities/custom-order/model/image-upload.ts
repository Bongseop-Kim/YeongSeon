import type { ImageRef } from "@yeongseon/shared";

export interface UploadedImage {
  name: string;
  url: string;
  fileId: string;
}

export interface ImageUploadHook {
  uploadedImages: UploadedImage[];
  isUploading: boolean;
  uploadFile: (file: File) => Promise<void>;
  removeImage: (index: number) => void;
  getImageRefs: () => ImageRef[];
  addExistingImage: (url: string, fileId: string, name: string) => void;
  addExistingImages: (images: UploadedImage[]) => void;
}
