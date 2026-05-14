import { escapeCssUrl } from "@/shared/lib/css-url";

export const TILE_BACKGROUND_SIZE = "35px 35px";

export const tileRepeatStyle = (url: string) => ({
  backgroundImage: `url("${escapeCssUrl(url)}")`,
  backgroundRepeat: "repeat" as const,
  backgroundSize: TILE_BACKGROUND_SIZE,
});
