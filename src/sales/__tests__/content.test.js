/* The sales page's words: plural Hebrew, the same parts in both languages, nothing unfinished, readable colours. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SALES } from "../content.js";

/** Every string in a tree of texts. */
const texts = (value) =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(texts) : value && typeof value === "object" ? Object.values(value).flatMap(texts) : [];

// the singular "you" and singular imperatives in Hebrew ("את" is left out: it is also the object marker)
const SINGULAR_YOU = /(?<![א-ת])(אתה|שלך|לך|עליך|אליך|ממך|אותך|בך|תוכל|תוכלי|הנך|צור קשר|נסה|הירשם|לחץ|הקלד|הזן)(?![א-ת])/;
const span = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
// bidi controls and zero-width characters: invisible, and able to reorder or hide text
const HIDDEN = [...span(0x200b, 0x200f), ...span(0x202a, 0x202e), ...span(0x2066, 0x2069), 0xfeff, 0x061c, 0x2060];

describe("the sales page's words", () => {
  it("speak to readers in the plural or impersonally in Hebrew", () => {
    expect(SINGULAR_YOU.test("מה שלך?")).toBe(true); // the check itself works
    for (const line of texts(SALES.he)) expect(line).not.toMatch(SINGULAR_YOU);
  });

  it("have the same parts in Hebrew and English, and no placeholders or hidden characters", () => {
    const shape = (value) =>
      typeof value === "string" ? "text" : Array.isArray(value) ? value.map(shape) : Object.fromEntries(Object.entries(value).map(([key, v]) => [key, shape(v)]));
    expect(shape(SALES.en)).toEqual(shape(SALES.he));
    expect(SALES.he.features.items).toHaveLength(6);
    expect(SALES.he.join.steps).toHaveLength(3);
    for (const line of [...texts(SALES.he), ...texts(SALES.en)]) {
      expect(line.trim()).not.toBe("");
      expect(line).not.toMatch(/TBD|TODO|lorem|___/i);
      expect(HIDDEN.filter((code) => line.includes(String.fromCodePoint(code))).map((code) => code.toString(16))).toEqual([]);
    }
  });

  it("keep text readable on the page: 4.5:1 or more for body text, gold and the buttons", () => {
    const css = readFileSync(new URL("../sales.css", import.meta.url), "utf8");
    const token = (name) => css.match(new RegExp(`--s-${name}:\\s*([^;]+);`))[1].trim();
    const rgb = (c) => (c.startsWith("#") ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
    const alpha = (c) => (c.startsWith("rgba") ? Number(c.match(/[\d.]+/g)[3]) : 1);
    const over = (fg, bg) => rgb(fg).map((v, i) => v * alpha(fg) + rgb(bg)[i] * (1 - alpha(fg)));
    const lum = (channels) => {
      const [r, g, b] = channels.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (fg, bg) => {
      const [a, b] = [lum(over(fg, bg)), lum(rgb(bg))].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    };
    for (const bg of ["bg", "panel"]) {
      for (const fg of ["ink", "ink-soft", "gold"]) expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(token("on-gold"), token("gold"))).toBeGreaterThanOrEqual(4.5);
  });
});
