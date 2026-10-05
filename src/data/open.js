import { createStore } from "./store.js";
import { idbBackend } from "./idbBackend.js";
import { memoryBackend } from "./memoryBackend.js";

/** One store per workspace name for the life of the page. */
const opened = new Map();

/**
 * Opens the workspace store on this device, once per page: IndexedDB when the
 * browser allows it, otherwise an in-memory store (store.persistent === false)
 * so the screen still works and can warn that nothing will be kept. Later
 * calls get the same store, so leaving the tab and coming back neither opens a
 * new connection nor, in the in-memory case, loses what was typed.
 */
export function openWorkspaceStore({ name = "numerology-workspace", idb = globalThis.indexedDB } = {}) {
  if (!opened.has(name)) opened.set(name, open(name, idb));
  return opened.get(name);
}

async function open(name, idb) {
  let backend;
  try {
    backend = await idbBackend(name, idb);
  } catch {
    backend = memoryBackend();
  }
  askToKeep();
  return createStore(backend);
}

/**
 * Asks the browser not to evict the data under storage pressure. Best effort,
 * and never waited for: some browsers answer only after the person decides.
 */
function askToKeep() {
  try {
    Promise.resolve(globalThis.navigator?.storage?.persist?.()).catch(() => {});
  } catch {
    /* not supported */
  }
}
