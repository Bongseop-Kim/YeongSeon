export const IMAGE_FOLDERS = {
  CUSTOM_ORDERS: "/custom-orders",
  REFORM: "/reform",
  PRODUCTS: "/products",
} as const;

export type ImageFolder = (typeof IMAGE_FOLDERS)[keyof typeof IMAGE_FOLDERS];
