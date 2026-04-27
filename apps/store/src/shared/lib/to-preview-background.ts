import { escapeCssUrl } from "@/shared/lib/css-url";

export const toPreviewBackground = (imageUrl: string): string =>
  `url("${escapeCssUrl(imageUrl)}") center/cover no-repeat`;
