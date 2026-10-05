import { createStore } from "./store.js";
import { idbBackend } from "./idbBackend.js";
import { memoryBackend } from "./memoryBackend.js";

/**
 * Opens the workspace store on this device: IndexedDB when the browser allows
 * it, otherwise an in-memory store (store.persistent === false) so the screen
 * still works and can warn that nothing will be kept.
 */
export async function openWorkspaceStore({ name = "numerology-workspace", idb = globalThis.indexedDB } = {}) {
  let backend;
  try {
    backend = await idbBackend(name, idb);
  } catch {
    backend = memoryBackend();
  }
  // Ask the browser not to evict the data under storage pressure. Best effort only.
  try {
    await globalThis.navigator?.storage?.persist?.();
  } catch {
    /* not supported, or refused */
  }
  return createStore(backend);
}
