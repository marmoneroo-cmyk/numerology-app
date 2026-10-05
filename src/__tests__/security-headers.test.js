/*
 * The browser-side protections Vercel sends with every page, and the rule
 * that keeps them working: the page itself carries no inline script, so the
 * Content-Security-Policy can refuse every script that is not one of ours.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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

describe("security headers", () => {
  it("send a Content-Security-Policy that runs only the site's own scripts", () => {
    expect(csp["default-src"]).toEqual(["'self'"]);
    expect(csp["script-src"]).toEqual(["'self'"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["form-action"]).toEqual(["'self'"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("allow exactly the outside sources the page uses: Google Fonts, Unsplash images and the accounts project", () => {
    expect(csp["style-src"]).toEqual(["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]);
    expect(csp["font-src"]).toEqual(["'self'", "https://fonts.gstatic.com"]);
    expect(csp["img-src"]).toEqual(["'self'", "data:", "blob:", "https://images.unsplash.com"]);
    expect(csp["connect-src"]).toEqual(["'self'", SUPABASE_URL]);
  });

  it("forbid sniffing, framing and needless device access", () => {
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toMatch(/camera=\(\)/);
    expect(headers["permissions-policy"]).toMatch(/microphone=\(\)/);
    expect(headers["permissions-policy"]).toMatch(/geolocation=\(\)/);
  });

  it("index.html has no inline script, which the policy would block", () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const [, attrs, body] of scripts) {
      expect(attrs).toMatch(/\bsrc=/);
      expect(body.trim()).toBe("");
    }
    expect(html).not.toMatch(/\son[a-z]+\s*=/i); // no inline event handlers either
  });
});
