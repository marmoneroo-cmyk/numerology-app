/*
 * The browser-side protections Vercel sends with every page, and the rule
 * that keeps them working: the page itself carries no inline script, so the
 * Content-Security-Policy can refuse every script that is not one of ours.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { SUPABASE_URL } from "../account/config.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const vercel = JSON.parse(read("../../vercel.json"));
const html = read("../../index.html");

const headers = Object.fromEntries((vercel.headers.find((h) => h.source === "/(.*)")?.headers || []).map((h) => [h.key.toLowerCase(), h.value]));
const csp = Object.fromEntries(
  (headers["content-security-policy"] || "").split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...values] = d.split(/\s+/);
    return [name, values];
  }),
);

/** The hash of each inline script in index.html that the browser runs (structured data is not run). */
const inlineScriptHashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attrs, body]) => !/\bsrc=/.test(attrs) && !/application\/ld\+json/.test(attrs) && body.trim())
  .map(([, , body]) => `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);

describe("security headers", () => {
  it("send a Content-Security-Policy that runs only the site's own scripts, and the one inline script by its hash", () => {
    expect(csp["default-src"]).toEqual(["'self'"]);
    expect(inlineScriptHashes).toHaveLength(1); // index.html's first-screen script
    expect(csp["script-src"]).toEqual(["'self'", ...inlineScriptHashes]);
    expect(csp["script-src"]).not.toContain("'unsafe-inline'");
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["form-action"]).toEqual(["'self'"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("allow exactly the outside sources the page uses: Unsplash images and the accounts project (the fonts are the site's own)", () => {
    expect(csp["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp["font-src"]).toEqual(["'self'"]);
    expect(csp["img-src"]).toEqual(["'self'", "data:", "blob:", "https://images.unsplash.com"]);
    expect(csp["connect-src"]).toEqual(["'self'", SUPABASE_URL]);
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it("forbid sniffing, framing, sharing a window with other sites, and needless device access", () => {
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["cross-origin-resource-policy"]).toBe("same-site");
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb", "serial", "bluetooth", "browsing-topics"]) {
      expect(headers["permissions-policy"]).toContain(`${feature}=()`);
    }
  });

  it("let the browser keep the files whose names change with every version, and the fonts, for a year", () => {
    const FILE = "(.+\\.[a-z0-9]+)"; // files only: a path without a dot is the page (index.html), which is never kept
    const cacheOf = (source) => vercel.headers.find((h) => h.source === source)?.headers.find((h) => h.key === "Cache-Control")?.value;
    expect(cacheOf(`/assets/${FILE}`)).toBe("public, max-age=31536000, immutable");
    expect(cacheOf(`/fonts/${FILE}`)).toBe("public, max-age=31536000, immutable");
    expect(cacheOf(`/sales/${FILE}`)).toBe("public, max-age=2592000, stale-while-revalidate=86400"); // long-cache.test.js
    const kept = (path) => new RegExp(`^/(assets|fonts|sales)/${FILE}$`).test(path);
    for (const path of ["/assets/index-a1.js", "/fonts/heebo-hebrew.woff2", "/sales/hero-bg.webp"]) expect([path, kept(path)]).toEqual([path, true]);
    for (const path of ["/sales/", "/fonts", "/assets/x", "/"]) expect([path, kept(path)]).toEqual([path, false]);
    // a missing file (any path with a dot: an old version's script, /ads.txt) is a 404, not the page; only paths
    // without one fall back to index.html
    expect(vercel.rewrites).toEqual([{ source: "/((?!.*\\.).*)", destination: "/index.html" }]);
    const fallsBack = (path) => new RegExp(`^${vercel.rewrites[0].source}$`).test(path);
    for (const path of ["/", "/studio", "/some/old/link"]) expect([path, fallsBack(path)]).toEqual([path, true]);
    for (const path of ["/assets/index-OLD.js", "/ads.txt", "/favicon.png", "/.env"]) expect([path, fallsBack(path)]).toEqual([path, false]);
  });

  it("index.html runs no inline script the policy does not name by its hash", () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const [, attrs, body] of scripts) {
      // structured data for search engines is JSON, which the browser never runs (the policy leaves it alone)
      if (/\btype="application\/ld\+json"/.test(attrs)) {
        expect(() => JSON.parse(body)).not.toThrow();
        continue;
      }
      if (/\bsrc=/.test(attrs)) {
        expect(body.trim()).toBe("");
        continue;
      }
      const hash = `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
      expect(csp["script-src"]).toContain(hash); // an edited script without a new hash would be blocked
    }
    expect(html).not.toMatch(/\son[a-z]+\s*=/i); // no inline event handlers either
  });
});
