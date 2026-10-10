/**
 * A deploy replaces the app's files; a page opened before it still asks for the old ones when it goes into the
 * Studio or the demo, and they are gone. Vite then fires `vite:preloadError`: reload once for the new files. A
 * second failure in the same tab lets the page's own error screen (Root's reload button) take over, never a loop.
 */
const RELOADED = "numerology_reloaded_for_new_files";

export function reloadOnStaleChunks(win = window, storage = sessionStorageOf(win)) {
  win.addEventListener("vite:preloadError", (event) => {
    try {
      if (storage.getItem(RELOADED)) return;
      storage.setItem(RELOADED, "1");
    } catch {
      return; // storage refused: no way to know whether this is the second try, so no reload
    }
    event.preventDefault();
    win.location.reload();
  });
}

function sessionStorageOf(win) {
  try {
    return win.sessionStorage;
  } catch {
    return null;
  }
}
