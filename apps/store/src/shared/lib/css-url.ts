export const escapeCssUrl = (url: string): string =>
  url.replace(/[\\"]/g, "\\$&").replace(/[\r\n]/g, " ");

export const unescapeCssUrl = (value: string): string =>
  value.replace(/\\(["'\\])/g, "$1");
