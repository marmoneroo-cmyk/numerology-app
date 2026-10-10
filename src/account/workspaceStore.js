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

let current = { userId: null, client: null, store: null, account: null };

/**
 * One store per signed-in user and account service for the life of the page. A refused session is told to the
 * account in use now: the Studio entered again gets a new provider over the same service. Another service under
 * the same user id (a new visit to the demo) starts a new store.
 */
export function accountStore(account) {
  const userId = account.profile.id;
  const client = account.service.client;
  if (current.userId !== userId || current.client !== client) {
    const backend = watchSession(serverBackend(client, userId), () => current.account?.check());
    current = { userId, client, store: createStore(backend), account };
  }
  current.account = account;
  return current.store;
}
