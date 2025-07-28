import { useState } from "react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { OrderOptions } from "../types/order";

interface UseImageUploadProps {
  setValue: UseFormSetValue<OrderOptions>;
  watch: UseFormWatch<OrderOptions>;
}

export const useImageUpload = ({ setValue, watch }: UseImageUploadProps) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const watchedValues = watch();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages((prev) => [...prev, ...files]);
    setValue("referenceImages", [
      ...(watchedValues.referenceImages || []),
      ...files,
    ]);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setValue("referenceImages", newImages);
  };

  return {
    selectedImages,
    handleImageUpload,
    removeImage,
  };
};
