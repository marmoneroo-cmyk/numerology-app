/** The signed-in subscriber's workspace, on the server. */
import { createStore } from "../data/store.js";
import { serverBackend, SessionError } from "../data/serverBackend.js";

/**
 * The backend, reporting to `onLost` whenever the server says this session
 * no longer works (the call still fails, so the screen shows its error too).
 */
export function watchSession(backend, onLost) {
  const watched = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof SessionError) onLost();
      throw e;
    }
  };
  return Object.fromEntries(Object.entries(backend).map(([key, value]) => [key, typeof value === "function" ? watched(value) : value]));
}

let current = { userId: null, store: null };

/** One store per signed-in user for the life of the page. */
export function accountStore(account) {
  const userId = account.profile.id;
  if (current.userId !== userId) {
    const backend = watchSession(serverBackend(account.service.client, userId), () => account.check());
    current = { userId, store: createStore(backend) };
  }
  return current.store;
}
