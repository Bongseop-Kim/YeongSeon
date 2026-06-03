export type DialogMobilePresentation = "dialog" | "sheet" | "fullscreen";

export const getDialogMobilePresentationClass = (
  mobilePresentation: DialogMobilePresentation,
) => {
  if (mobilePresentation === "sheet") {
    return "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[85dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-hidden max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0";
  }

  if (mobilePresentation === "fullscreen") {
    return "max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0";
  }

  return undefined;
};
