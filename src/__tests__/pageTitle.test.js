/* The tab's title follows the view: each legal page and the demo name themselves, the sales page keeps index.html's. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pageTitle, SALES_TITLE } from "../pageTitle.js";
import { nextRoute, LEGAL_HASHES } from "../routes.js";
import { LEGAL_DOCS } from "../legal/content.js";

const html = readFileSync(join(process.cwd(), "index.html"), "utf8"); // the tests run from the project folder
const route = (hash) => nextRoute(null, hash, { initial: true });

describe("the page title", () => {
  it("keeps index.html's title on the sales page, the one the build prerenders", () => {
    expect(html).toContain(`<title>${SALES_TITLE.he}</title>`);
    expect(pageTitle(route(""), true)).toBe(SALES_TITLE.he);
    expect(pageTitle(route(""), false)).toBe(SALES_TITLE.en);
    // an anchor on the sales page changes nothing
    expect(pageTitle(nextRoute(route(""), "#sales-faq"), true)).toBe(SALES_TITLE.he);
  });

  it("names each legal page, then the brand", () => {
    expect(pageTitle(route("#terms"), true)).toBe("תנאי שימוש · הסטודיו");
    expect(pageTitle(route("#accessibility"), true)).toBe("הצהרת נגישות · הסטודיו");
    expect(pageTitle(route("#refunds"), false)).toBe("Cancellation and Refund Policy · The Studio");
    for (const doc of LEGAL_HASHES) {
      expect(pageTitle(route(`#${doc}`), true)).toBe(`${LEGAL_DOCS[doc].he.title} · הסטודיו`);
      expect(pageTitle(route(`#${doc}`), false)).toBe(`${LEGAL_DOCS[doc].en.title} · The Studio`);
    }
  });

  it("names a legal page opened over the app as well", () => {
    const demo = nextRoute(null, "#demo");
    expect(pageTitle(nextRoute(demo, "#privacy"), true)).toBe("מדיניות פרטיות · הסטודיו");
  });

  it("names the demo and the Studio, and leaves Shani's page on the default title", () => {
    expect(pageTitle(route("#demo"), true)).toBe("הדגמה · הסטודיו");
    expect(pageTitle(route("#demo"), false)).toBe("Demo · The Studio");
    expect(pageTitle(route("#studio"), true)).toBe("הסטודיו");
    expect(pageTitle(route("#customer"), true)).toBe(SALES_TITLE.he);
  });

  it("falls back to the sales page's title for anything it does not know", () => {
    for (const odd of [null, undefined, {}, { world: "sales", view: "home", legal: "__proto__" }, { world: "app", view: "toString", legal: null }]) {
      expect(pageTitle(odd, true)).toBe(SALES_TITLE.he);
    }
  });
});
