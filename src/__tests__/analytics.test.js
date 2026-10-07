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

  it("stays off until Web Analytics is enabled for the project in Vercel", () => {
    // until then the site answers the script's address with its own page, and the browser logs an error on every visit
    const load = vi.fn();
    startAnalytics({ production: true, load });
    expect(load).not.toHaveBeenCalled();
  });
});
