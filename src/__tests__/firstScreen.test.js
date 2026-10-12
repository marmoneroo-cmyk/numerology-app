// @vitest-environment jsdom
/*
 * index.html's first-screen script: it runs before anything is drawn, so it repeats two rules of src/routes.js
 * (which addresses open the app, and the kept login's key). These tests hold the copy to the rules, and check what
 * it does: on an app address or with a kept login it hides the drawn sales page; on the sales page it starts the
 * hero image and the heading font early.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROUTE_HASHES, SAVED_LOGIN_KEY, opensOnSalesPage } from "../routes.js";

const html = readFileSync(join(process.cwd(), "index.html"), "utf8"); // the tests run from the project folder
const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
const run = () => new Function(script)();

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn((q) => ({ matches: q.includes("959px") })));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-first-screen");
  document.head.querySelectorAll("link[rel=preload]").forEach((l) => l.remove());
  window.location.hash = "";
  localStorage.clear();
});

describe("the first-screen script", () => {
  it("knows the same addresses and the same kept-login key as routes.js", () => {
    const listed = /\^#\(([^)]+)\)\$/.exec(script)[1].split("|");
    expect([...listed].sort()).toEqual([...ROUTE_HASHES].sort());
    expect(script).toContain(`"${SAVED_LOGIN_KEY}"`);
  });

  it("hides the drawn sales page exactly where the app (or a legal page) opens first", () => {
    for (const hash of ["", "#demo", "#studio", "#customer", "#owner", "#terms", "#sales-faq"]) {
      window.location.hash = hash;
      document.documentElement.removeAttribute("data-first-screen");
      run();
      const hidden = document.documentElement.getAttribute("data-first-screen") === "app";
      expect([hash, hidden]).toEqual([hash, !opensOnSalesPage(hash, localStorage)]);
    }
  });

  it("hides it for a kept login at the plain address, as Root opens the Studio there", () => {
    localStorage.setItem(SAVED_LOGIN_KEY, "{}");
    run();
    expect(document.documentElement.getAttribute("data-first-screen")).toBe("app");
    expect(document.head.querySelectorAll("link[rel=preload]")).toHaveLength(0); // nothing of the sales page is fetched
  });

  it("on the sales page starts the hero image for the screen's width, and the heading font", () => {
    run();
    const [image, font] = document.head.querySelectorAll("link[rel=preload]");
    expect(image.as).toBe("image"); // a property, which browsers reflect as the attribute (the test DOM does not)
    expect(image.fetchPriority).toBe("high");
    expect(image.getAttribute("href")).toBe("/sales/hero-bg-960.webp"); // a narrow screen, as stubbed
    expect(font.getAttribute("href")).toBe("/fonts/frank-ruhl-libre-hebrew.woff2");
    expect(font.crossOrigin).toBe("anonymous");
  });

  it("starts the same hero picture the sales page's stylesheet shows, at the same screen widths", () => {
    const css = readFileSync(join(process.cwd(), "src", "sales", "sales.css"), "utf8");
    const narrow = /@media \(max-width: (\d+)px\) \{[^@]*?background-image: url\("([^"]+)"\)/.exec(css);
    const wide = /\.sales-hero[^{]*\{[^}]*background: url\("([^"]+)"\)/.exec(css);
    expect(script).toContain(`matchMedia("(max-width: ${narrow[1]}px)").matches?"${narrow[2]}":"${wide[1]}"`);
  });

  it("on Shani's page starts its background picture at once, and only there (the privacy page says Unsplash is reached there)", () => {
    const heroImg = /const HERO_IMG = "([^"]+)"/.exec(readFileSync(join(process.cwd(), "src", "App.jsx"), "utf8"))[1];
    window.location.hash = "#customer";
    run();
    const preloads = document.head.querySelectorAll("link[rel=preload]");
    expect(preloads).toHaveLength(1);
    expect(preloads[0].getAttribute("href")).toBe(heroImg);
    expect(preloads[0].as).toBe("image");
    expect(preloads[0].fetchPriority).toBe("high");
    expect(preloads[0].crossOrigin).toBeNull(); // like the page's <img>, so the browser uses this download
    preloads[0].remove();
    for (const hash of ["#demo", "#studio", "#privacy"]) {
      window.location.hash = hash;
      run();
      expect([hash, document.head.querySelectorAll("link[rel=preload]").length]).toEqual([hash, 0]);
    }
  });

  it("keeps going where storage is blocked: no kept login can be read, so the sales page shows", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(run).not.toThrow();
    expect(document.documentElement.getAttribute("data-first-screen")).toBeNull();
  });

  it("is styled to hide the drawn page while the attribute is there", () => {
    expect(html).toContain('html[data-first-screen="app"] #root > .sales { display: none; }');
  });
});
