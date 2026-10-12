/*
 * What search engines and link previews read (the audits of 2026-10-12): the page's title, description and
 * structured data, which must state the same price and trial as the sales page, and the files crawlers ask for.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { PRICE_MONTHLY, TRIAL_DAYS } from "../sales/config.js";
import { LEGAL_EMAIL } from "../legal/content.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../../index.html");
const meta = (attr, name) => new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html)?.[1];
const jsonLd = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
const node = (type) => jsonLd["@graph"].find((n) => n["@type"] === type);

describe("the page as search engines see it", () => {
  it("leads its title and description with what it is, and states the price and the trial of the sales page", () => {
    const title = /<title>([^<]*)<\/title>/.exec(html)[1];
    expect(title.startsWith("תוכנה לנומרולוגים")).toBe(true);
    const description = meta("name", "description");
    expect(description.startsWith("תוכנה לנומרולוגים")).toBe(true);
    expect(description).toContain(`₪${PRICE_MONTHLY} לחודש`);
    expect(description).toContain(`${TRIAL_DAYS} ימי ניסיון חינם`);
    expect(meta("property", "og:description")).toBe(description);
    expect(meta("property", "og:title")).toBe(title);
    expect(meta("property", "og:url")).toBe("https://studio.shani-cohen.com/");
    expect(/<link rel="canonical" href="([^"]+)"/.exec(html)[1]).toBe("https://studio.shani-cohen.com/");
  });

  it("describes the site and its offer in structured data, with the sales page's own price and trial", () => {
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(node("WebSite").url).toBe("https://studio.shani-cohen.com/");
    const app = node("WebApplication");
    expect(app.offers.price).toBe(String(PRICE_MONTHLY));
    expect(app.offers.priceCurrency).toBe("ILS");
    expect(app.offers.priceSpecification).toMatchObject({ price: String(PRICE_MONTHLY), unitCode: "MON" });
    expect(app.offers.description).toContain(`${TRIAL_DAYS} ימי ניסיון חינם`);
    // nothing invented: no ratings or reviews exist, so none is claimed
    expect(JSON.stringify(jsonLd)).not.toMatch(/aggregateRating|review/i);
  });

  it("serves the files crawlers and browsers ask for, each well formed", () => {
    const robots = read("../../public/robots.txt");
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toContain("Sitemap: https://studio.shani-cohen.com/sitemap.xml");
    expect(read("../../public/sitemap.xml")).toContain("<loc>https://studio.shani-cohen.com/</loc>");
    const llms = read("../../public/llms.txt");
    expect(llms).toMatch(/^# /); // a Markdown title
    expect(llms).toMatch(/\]\(https:\/\/studio\.shani-cohen\.com\//); // and links
    expect(llms).toContain(`${PRICE_MONTHLY} ₪ עם ${TRIAL_DAYS} ימי ניסיון`); // the sales page's price and trial
    // the address the legal pages give, and a date to renew it by (RFC 9116: at most a year ahead)
    const security = read("../../public/.well-known/security.txt");
    expect(security).toContain(`Contact: mailto:${LEGAL_EMAIL}\n`);
    expect(security).toMatch(/^Expires: \d{4}-\d\d-\d\dT00:00:00\.000Z$/m);
    for (const file of ["favicon.svg", "favicon.ico", "apple-touch-icon.png", "404.html"]) {
      expect([file, existsSync(new URL(`../../public/${file}`, import.meta.url))]).toEqual([file, true]);
    }
    expect(read("../../public/404.html")).toContain('<meta name="robots" content="noindex" />');
  });
});
