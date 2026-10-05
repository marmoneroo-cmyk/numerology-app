/**
 * The workspace's write lock. Every change runs while holding it, so a change
 * worked out from what it read never interleaves with another change: in this
 * tab, or, through the Web Locks API, in another tab of the same site.
 * Interleaved, a save in one tab could bring back a client that was just
 * deleted in another.
 */
const LOCK_NAME = "numerology-workspace-write";
const noop = () => {};
let queue = Promise.resolve();

/** Runs `fn` once every earlier `fn` of this page has settled (for browsers without Web Locks). */
function pageLock(fn) {
  const run = queue.then(() => fn());
  queue = run.then(noop, noop);
  return run;
}

/**
 * @template T
 * @param {() => Promise<T>} fn the change; it must not take the lock itself
 * @returns {Promise<T>}
 */
export function writeLock(fn) {
  const locks = globalThis.navigator?.locks;
  return typeof locks?.request === "function" ? locks.request(LOCK_NAME, () => fn()) : pageLock(fn);
}
