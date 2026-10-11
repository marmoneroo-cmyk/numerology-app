/*
 * Every text field in the main app caps its length: a name or a date fits with
 * room to spare, and a runaway paste cannot make the page compute and draw a
 * breakdown for every letter of a megabyte of text.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");

/** Each `<input …/>` tag in App.jsx, up to its closing `/>` (its handlers' `=>` would end a plain `[^>]*`). */
const inputTags = source
  .split(/<input\b/)
  .slice(1)
  .map((rest) => rest.slice(0, rest.indexOf("/>")));

describe("the main app's text fields", () => {
  it("each cap the length of what can be typed or pasted", () => {
    expect(inputTags.length).toBeGreaterThan(20); // the check sees the fields
    expect(inputTags.filter((tag) => !/\smaxLength=\{MAX_(INPUT|EMAIL)\}\s/.test(tag))).toEqual([]);
  });
});
