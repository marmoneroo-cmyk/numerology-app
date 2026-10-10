/*
 * Page-view counting: on the live site only, and never with the address's query or fragment,
 * which could carry a reset token or a client's details.
 */
import { describe, it, expect, vi } from "vitest";
import { scrubbed, startAnalytics } from "../analytics.js";

describe("analytics", () => {
  it("sends the page address without its query or fragment", () => {
    const event = { type: "pageview", url: "https://numerology-app-orcin.vercel.app/studio?code=123456#access_token=abc&type=recovery" };
    expect(scrubbed(event)).toEqual({ type: "pageview", url: "https://numerology-app-orcin.vercel.app/studio" });
    expect(event.url).toContain("#access_token"); // the event it was given is left as it was
  });

  it("keeps the app's own route names, and drops any other fragment", () => {
    const at = (url) => scrubbed({ type: "pageview", url }).url;
    expect(at("https://studio.shani-cohen.com/#demo")).toBe("https://studio.shani-cohen.com/#demo");
    expect(at("https://studio.shani-cohen.com/?ref=x#privacy")).toBe("https://studio.shani-cohen.com/#privacy");
    expect(at("https://studio.shani-cohen.com/#access_token=abc")).toBe("https://studio.shani-cohen.com/");
    expect(at("https://studio.shani-cohen.com/#__proto__")).toBe("https://studio.shani-cohen.com/");
  });

  it("counts a view that only the hash changed (a link to #demo), and only once analytics runs", async () => {
    vi.resetModules(); // a fresh module: whether analytics started is the module's own state
    const fresh = await import("../analytics.js");
    const send = vi.fn();
    const where = { pathname: "/", hash: "#demo" };
    fresh.countView({ send, where });
    expect(send).not.toHaveBeenCalled(); // not started: the tests, the local server
    fresh.startAnalytics({ production: true, enabled: true, load: vi.fn() });
    fresh.countView({ send, where });
    expect(send).toHaveBeenCalledWith({ path: "/#demo" });
  });

  it("drops an event whose address cannot be read, rather than sending it whole", () => {
    expect(scrubbed({ type: "pageview", url: "not a url" })).toBeNull();
  });

  it("starts only in the live build, once it is switched on, with the scrubbing in place", () => {
    const load = vi.fn();
    startAnalytics({ production: false, enabled: true, load });
    startAnalytics({ production: true, enabled: false, load });
    expect(load).not.toHaveBeenCalled();
    startAnalytics({ production: true, enabled: true, load });
    expect(load).toHaveBeenCalledWith({ mode: "production", beforeSend: scrubbed });
  });

  it("is on in the live build, now that Web Analytics is enabled for the project in Vercel", () => {
    const load = vi.fn();
    startAnalytics({ production: true, load });
    expect(load).toHaveBeenCalledWith({ mode: "production", beforeSend: scrubbed });
  });
});
