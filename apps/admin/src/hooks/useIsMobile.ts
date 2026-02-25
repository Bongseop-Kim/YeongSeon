import { Grid } from "antd";

export function useIsMobile() {
  const breakpoint = Grid.useBreakpoint();
  return typeof breakpoint.lg === "undefined" ? false : !breakpoint.lg;
}
