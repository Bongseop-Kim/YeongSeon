export const escapeCssUrl = (url: string): string =>
  url.replace(/[\\"]/g, "\\$&").replace(/[\r\n]/g, " ");
