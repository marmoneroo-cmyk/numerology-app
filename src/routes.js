/**
 * Which screen an address shows. Only the hash is read: it names a view (#studio, #customer, #demo) or a
 * legal page (#terms, #privacy, #refunds). Pure, so the rules are tested on their own.
 */
import { SUPABASE_URL } from "./account/config.js";

/** The legal pages a link opens by name. */
export const LEGAL_HASHES = ["terms", "privacy", "refunds"];

/** The hashes that name a view of the app; #owner and #admin are older names of the Studio. */
const APP_VIEWS = { studio: "studio", owner: "studio", admin: "studio", customer: "customer", demo: "demo" };

/** Every hash the app routes: analytics keeps these and drops any other fragment. */
export const ROUTE_HASHES = [...Object.keys(APP_VIEWS), ...LEGAL_HASHES];

/**
 * The view a hash names: "home" (no hash), "studio", "customer", "demo" or "legal"; null for a fragment the
 * app does not route, such as an anchor on a page.
 */
export function viewOf(hash) {
  const name = String(hash ?? "").replace(/^#/, "");
  if (!name) return "home";
  if (LEGAL_HASHES.includes(name)) return "legal";
  return Object.hasOwn(APP_VIEWS, name) ? APP_VIEWS[name] : null;
}

/**
 * Where the page is after the address changed to `hash`.
 * - A legal page opens over the view the visitor came from.
 * - A fragment the app does not route changes nothing.
 * - No hash is the sales page, except on the first load of a browser that keeps a login: that opens the Studio.
 * @returns {{ world: "sales" | "app", view: "home" | "studio" | "customer" | "demo", legal: string | null }}
 */
export function nextRoute(current, hash, { initial = false, signedIn = false } = {}) {
  const view = viewOf(hash);
  const here = current ?? { world: "sales", view: "home", legal: null };
  if (view === "legal") return { ...here, legal: String(hash).replace(/^#/, "") };
  if (view === null) return here;
  if (view === "home") return initial && signedIn ? { world: "app", view: "studio", legal: null } : { world: "sales", view: "home", legal: null };
  return { world: "app", view, legal: null };
}

/** The address of a view: the sales page has none. */
export const hashFor = (view) => (view === "home" ? "" : `#${view}`);

/** supabase-js keeps a login under this key (its default for the project); only whether it is there is read. */
export const SAVED_LOGIN_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

/** Whether this browser keeps a Studio login. Storage that throws (blocked, private mode) means no. */
export function hasSavedLogin(storage) {
  try {
    return Boolean(storage?.getItem(SAVED_LOGIN_KEY));
  } catch {
    return false;
  }
}
