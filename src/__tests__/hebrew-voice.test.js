/*
 * The owner's rule for every Hebrew text in the app: the plural or an impersonal form, never the reader in
 * the singular (2026-10-12: the interface, the interpretations, the rituals and the recommendations alike).
 * Every Hebrew text in src (tests aside), index.html and the reset-password email is checked: strings in any
 * quotes, the text between JSX tags, and every word ending in ך, which is how Hebrew says "your".
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HEBREW_REWORDING } from "../engine/index.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC = join(ROOT, "src");

// the singular "you" and second-person forms, after a prefix too (ושלך, כשאתה); לך and בך only after ו,
// since מלך and הלך are other words
const YOU = /(?<![א-ת])(?:ו|ש|כש|וכש|ה|מ)?(אתה|שלך|עליך|אליך|ממך|אותך|הנך|תוכל|תוכלי|איתך|אתך|כמוך|את\/ה|נולדת)(?![א-ת])|(?<![א-ת])ו?(לך|בך)(?![א-ת])/;
// masculine orders the app has used, after ו too ("ובחר"); מלא only as an order ("מלא את", "מלא שם")
const ORDER = /(?<![א-ת])ו?(הוסף|מחק|ערוך|שלח|הזן|בדוק|הצג|הסתר|שתף|העתק|צור|הדפס|נסה|חפש|בחר|גלול|הקלד|כתוב|צפה|קבל|תן|קח|עשה|אמור|זכור|החזק|דמיין|הדלק|הכן|למד|שחרר|גלה|התחל|סיים|צא|עקוב|הקשב|הנח|המתן|צלול|שמור|חשב|הכנס|תירא|ודא|חשוף)(?![א-ת])|(?<![א-ת])(אנא\s+)?מלא\s+(את|שם)(?![א-ת])/;
// the words ending in ך the app uses that are not "your": a new one needs a look before it joins
const NOT_YOUR = new Set([
  "תאריך", "ותאריך", "התאריך", "ערך", "צריך", "שצריך", "איך", "ואיך", "בתוך", "מתוך", "תוך", "כך", "וכך", "דרך", "הדרך",
  "שבדרך", "מסך", "המסך", "במסך", "ובמסך", "למסך", "להפוך", "המשך", "בהמשך", "להמשיך", "שמושך", "סמך", "לסמוך", "להסתמך",
  "מוסמך", "המסמך", "ארוך", "הנמוך", "התווך", "שייך", "תומך", "מרכך", "להעריך", "צורך", "הצורך",
]);
// quotes that must read as they do elsewhere: another app's own button, and the old wording kept to translate saved readings
const KEPT_AS_THEY_ARE = ["“הזן קוד באופן ידני”", ...Object.keys(HEBREW_REWORDING)];

/** Every .js and .jsx file under `dir`, tests left out. */
function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sources(path);
    return /\.(js|jsx)$/.test(name) ? [path] : [];
  });
}
/** The code without its comments (a // after a colon, as in https://, is not one). */
const uncommented = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
/** The Hebrew texts in a piece of code: any quoted string, and the text between JSX tags. */
function hebrewIn(code, jsx) {
  const texts = [...code.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  if (jsx) texts.push(...[...code.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]));
  return texts.filter((t) => /[א-ת]/.test(t));
}

const TEXTS = [
  ...sources(SRC).flatMap((file) => hebrewIn(uncommented(readFileSync(file, "utf8")), file.endsWith(".jsx")).map((text) => ({ where: file.slice(ROOT.length), text }))),
  ...["index.html", join("supabase", "templates", "recovery.html")].map((file) => ({
    where: file,
    text: readFileSync(join(ROOT, file), "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " "),
  })),
];
const plain = (text) => KEPT_AS_THEY_ARE.reduce((t, kept) => t.split(kept).join(" "), text);

describe("the app's Hebrew", () => {
  it("is all checked, and the checks catch what they should", () => {
    expect(TEXTS.length).toBeGreaterThan(900);
    for (const [text, caught] of [
      ["מה שלך?", true], ["ושלך", true], ["כשאתה מוכן", true], ["ולך", true], ["מי את/ה?", true], ["מתי נולדת?", true],
      ["חשב", true], ["ובחר", true], ["אנא מלא את כל השדות", true], ["אנא ודא", true],
      ["ערך השם", false], ["מלך", false], ["הלך", false], ["בית מלא חיים", false], ["לחשב", false], ["תאריך הלידה", false],
    ]) expect([text, YOU.test(text) || ORDER.test(text)]).toEqual([text, caught]);
  });

  it("never speaks to the reader in the singular, and gives no masculine orders", () => {
    const found = TEXTS.filter(({ text }) => YOU.test(plain(text)) || ORDER.test(plain(text)));
    expect(found.map(({ where, text }) => `${where}: ${text.trim().slice(0, 60)}`)).toEqual([]);
  });

  it("has no word ending in ך that is not on the list of words that are not 'your'", () => {
    const words = new Set(TEXTS.flatMap(({ text }) => plain(text).match(/[א-ת]+ך(?![א-ת])/g) || []));
    expect([...words].filter((w) => !NOT_YOUR.has(w))).toEqual([]);
  });
});
