/*
 * Browsers keep /fonts/ files for a year without asking again, and /sales/ pictures for 30 days (vercel.json). A file
 * replaced under the same name would reach returning visitors only after that, so a changed file needs a new name
 * (and the places that name it: src/fonts.css, index.html, src/sales/sections.jsx). This list is how a change is
 * noticed: each file with the start of its SHA-256. A new or changed file fails here until it is listed, under a new
 * name if it replaces one. (/assets/ needs no list: the build names each file by its contents.)
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const LISTED = {
  "fonts/cormorant-garamond-italic-latin.woff2": "e48e58027030df56",
  "fonts/cormorant-garamond-latin.woff2": "d80df8ff5aecd299",
  "fonts/frank-ruhl-libre-hebrew.woff2": "acdf9ed0a3fc287d",
  "fonts/frank-ruhl-libre-latin.woff2": "b8081e5e9acd530d",
  "fonts/heebo-hebrew.woff2": "f1f7cfaef59431c7",
  "fonts/heebo-latin.woff2": "50dae2e12dae22c9",
  "fonts/noto-sans-hebrew-hebrew.woff2": "8dd0a0bc744eca2c",
  "fonts/noto-sans-hebrew-latin.woff2": "27fd789f4089b6aa",
  "sales/hero-bg-960.webp": "3453f457e77c756c",
  "sales/hero-bg.webp": "c60bd2ef4093f291",
  // v2 (2026-10-13): the pictures taken again without the +1, under new names
  "sales/og-v2.jpg": "966a40eb3bf69dd4",
  "sales/shot-how-v2-560.webp": "d9bc310c36e59103",
  "sales/shot-how-v2.webp": "f8de43df332d28c8",
  "sales/shot-summary-v2-720.webp": "c341bf6166acbb8b",
  "sales/shot-summary-v2.webp": "7cb54702019a4f20",
  "sales/shot-today-v2-720.webp": "58231487d7c18d32",
  "sales/shot-today-v2.webp": "7c65b78e60b77c6f",
};

const PUBLIC = join(process.cwd(), "public"); // the tests run from the project folder
const hashOf = (file) => createHash("sha256").update(readFileSync(join(PUBLIC, file))).digest("hex").slice(0, 16);

describe("files browsers keep for a long time", () => {
  it("are each listed with their contents: a changed one needs a new name", () => {
    const present = ["fonts", "sales"].flatMap((dir) => readdirSync(join(PUBLIC, dir)).map((name) => `${dir}/${name}`));
    expect(Object.fromEntries(present.sort().map((file) => [file, hashOf(file)]))).toEqual(LISTED);
  });
});
