export const IMAGE_FOLDERS = {
  CUSTOM_ORDERS: "/custom-orders",
  SAMPLE_ORDERS: "/sample-orders",
  REFORM: "/reform",
  REPAIR_SHIPPING: "/repair-shipping",
  PRODUCTS: "/products",
  DESIGN_SESSIONS: "/design-sessions",
} as const;

export type ImageFolder = (typeof IMAGE_FOLDERS)[keyof typeof IMAGE_FOLDERS];
