/**
 * The Studio's theme, remembered between visits (the owner, 2026-10-12: the light theme was lost on every
 * load). Only the Studio's choice is kept; the customer page always opens dark. A browser that keeps nothing
 * (private browsing, blocked storage) simply opens the Studio dark.
 */
export const STUDIO_THEME_KEY = "studio-theme";

/** Whether the Studio opens dark: yes, unless the light theme was the last one chosen there. */
export function storedStudioDark(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(STUDIO_THEME_KEY) !== "light";
  } catch {
    return true;
  }
}

/** Keeps the Studio's theme for the next visit; a storage that refuses only means it is not remembered. */
export function rememberStudioTheme(dark, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STUDIO_THEME_KEY, dark ? "dark" : "light");
  } catch {
    // not remembered: the theme still changes for this visit
  }
}
