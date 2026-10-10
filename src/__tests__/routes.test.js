/* Which screen an address shows: the rules, apart from React. */
import { describe, it, expect } from "vitest";
import { viewOf, nextRoute, hashFor, hasSavedLogin, SAVED_LOGIN_KEY, ROUTE_HASHES } from "../routes.js";

const HOME = { world: "sales", view: "home", legal: null };
const app = (view) => ({ world: "app", view, legal: null });

describe("routes", () => {
  it("names the view of each address, and nothing for a fragment it does not route", () => {
    expect(viewOf("")).toBe("home");
    expect(viewOf("#")).toBe("home");
    expect(viewOf(undefined)).toBe("home");
    for (const hash of ["#studio", "#owner", "#admin"]) expect(viewOf(hash)).toBe("studio");
    expect(viewOf("#customer")).toBe("customer");
    expect(viewOf("#demo")).toBe("demo");
    for (const hash of ["#terms", "#privacy", "#refunds"]) expect(viewOf(hash)).toBe("legal");
    for (const hash of ["#reading-section", "#__proto__", "#constructor", "#toString", "#Studio"]) expect(viewOf(hash)).toBeNull();
  });

  it("opens the sales page on a plain address, and the Studio only on the first load of a browser that keeps a login", () => {
    expect(nextRoute(null, "", { initial: true })).toEqual(HOME);
    expect(nextRoute(null, "", { initial: true, signedIn: true })).toEqual(app("studio"));
    expect(nextRoute(app("studio"), "", { signedIn: true })).toEqual(HOME); // leaving the Studio goes home, login or not
  });

  it("opens the app's views in the app", () => {
    for (const view of ["studio", "customer", "demo"]) expect(nextRoute(HOME, `#${view}`)).toEqual(app(view));
  });

  it("opens a legal page over the view the visitor came from, and closes it back to that view", () => {
    expect(nextRoute(HOME, "#privacy")).toEqual({ ...HOME, legal: "privacy" });
    expect(nextRoute(app("customer"), "#terms")).toEqual({ ...app("customer"), legal: "terms" });
    expect(nextRoute(null, "#refunds", { initial: true, signedIn: true })).toEqual({ ...HOME, legal: "refunds" });
    expect(nextRoute({ ...app("customer"), legal: "terms" }, "#customer")).toEqual(app("customer"));
  });

  it("changes nothing on the sales page for a fragment it does not route, and leaves the app for it", () => {
    const sales = { ...HOME };
    expect(nextRoute(sales, "#sales-features")).toBe(sales);
    expect(nextRoute(null, "#nothing", { initial: true })).toEqual(HOME);
    // the app sets no such fragment itself: one arrives by the browser's back button, to a shared address
    expect(nextRoute(app("demo"), "#pricing")).toEqual(HOME);
  });

  it("gives each view its address", () => {
    expect(hashFor("home")).toBe("");
    expect(hashFor("demo")).toBe("#demo");
    expect(hashFor("studio")).toBe("#studio");
    expect(ROUTE_HASHES).toEqual(expect.arrayContaining(["studio", "demo", "customer", "terms", "privacy", "refunds"]));
  });

  it("knows a kept login only by its key, and takes unreadable storage as none", () => {
    expect(SAVED_LOGIN_KEY).toBe("sb-kcgjdxubcdmbrjlftxyv-auth-token");
    const store = (value) => ({ getItem: (key) => (key === SAVED_LOGIN_KEY ? value : null) });
    expect(hasSavedLogin(store('{"access_token":"x"}'))).toBe(true);
    expect(hasSavedLogin(store(null))).toBe(false);
    expect(hasSavedLogin({ getItem: () => { throw new Error("blocked"); } })).toBe(false);
    expect(hasSavedLogin(undefined)).toBe(false);
  });
});
