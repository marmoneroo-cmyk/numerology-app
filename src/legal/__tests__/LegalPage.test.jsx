// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import LegalPage from "../LegalPage.jsx";
import { LEGAL_DOCS, LEGAL_EMAIL, LEGAL_UPDATED, OPERATOR_NAME, OPERATOR_ID, buildLegalDocs, phoneOf } from "../content.js";
import { LEGAL_HASHES } from "../../routes.js";
import { PRICE_MONTHLY, SALES_WHATSAPP, TRIAL_DAYS } from "../../sales/config.js";

const DOCS = ["terms", "privacy", "refunds", "accessibility"];
const LANGUAGES = [
  { he: true, key: "he", name: "Hebrew", dir: "rtl", date: "30.10.2026", updated: "עודכן לאחרונה" },
  { he: false, key: "en", name: "English", dir: "ltr", date: "30 October 2026", updated: "Last updated" },
];

/** Every string a page shows: its title, and each section's title, paragraphs and items. */
const textsOf = (page) => [page.title, ...page.sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.items || [])])];
const allText = (page) => textsOf(page).join("\n");

const span = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
// bidi controls and zero-width characters: invisible, and able to reorder or hide text
const HIDDEN = [...span(0x200b, 0x200f), ...span(0x202a, 0x202e), ...span(0x2066, 0x2069), 0xfeff, 0x061c, 0x2060];
/** The code points (in hex) of the hidden characters in `text`. */
const hiddenIn = (text) => HIDDEN.filter((code) => text.includes(String.fromCodePoint(code))).map((code) => code.toString(16));

// the singular "you" in Hebrew, either gender: the pages speak to readers in the plural or impersonally
const SINGULAR_YOU = /(?<![א-ת])(אתה|שלך|לך|עליך|אליך|ממך|אותך|בך|תוכל|תוכלי|הנך|צור קשר)(?![א-ת])/;

/** The relative luminance of an "rgb(r, g, b)" or "#rrggbb" colour, as WCAG defines it. */
function luminance(colour) {
  const channels = colour.startsWith("#") ? [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16)) : colour.match(/\d+/g).slice(0, 3).map(Number);
  const [r, g, b] = channels.map((value) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
/** The colour an element's text shows in: its own inline colour, or the nearest one above it. */
const colourOf = (el) => {
  for (let node = el; node; node = node.parentElement) if (node.style?.color) return node.style.color;
  return null;
};

afterEach(cleanup);

describe("legal pages", () => {
  for (const doc of DOCS) {
    for (const lang of LANGUAGES) {
      it(`shows the ${doc} page in ${lang.name}: the title, its sections, the date and the contact link`, () => {
        const page = LEGAL_DOCS[doc][lang.key];
        const { container } = render(<LegalPage doc={doc} he={lang.he} />);
        const root = container.firstChild;
        expect(root.getAttribute("dir")).toBe(lang.dir);
        expect(root.getAttribute("lang")).toBe(lang.key);
        expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeTruthy();
        const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
        expect(sections.length).toBeGreaterThanOrEqual(4);
        expect(sections).toEqual(page.sections.map((s) => s.title));
        expect(container.querySelectorAll("ul").length).toBe(page.sections.filter((s) => s.items?.length).length);
        const date = container.querySelector("time");
        expect(date.getAttribute("datetime")).toBe(LEGAL_UPDATED);
        expect(date.textContent).toBe(lang.date);
        expect(date.parentElement.textContent).toContain(lang.updated);
        const mail = screen.getAllByRole("link", { name: LEGAL_EMAIL });
        for (const link of mail) expect(link.getAttribute("href")).toBe(`mailto:${LEGAL_EMAIL}`);
      });
    }
  }

  it("moves the focus to the title when the page opens, and again when another page opens", () => {
    const { rerender } = render(<LegalPage doc="privacy" />);
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(title);
    document.activeElement.blur();
    rerender(<LegalPage doc="refunds" />);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: LEGAL_DOCS.refunds.he.title }));
  });

  it("goes back to the site with the button at the top, in both languages", () => {
    const onBack = vi.fn();
    render(<LegalPage doc="terms" onBack={onBack} />);
    const back = screen.getByRole("button", { name: "חזרה לאתר" });
    expect(back.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
    cleanup();
    render(<LegalPage doc="terms" he={false} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to the site" }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it("shows no back button when there is nowhere to go back to", () => {
    render(<LegalPage doc="terms" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing for an unknown page", () => {
    for (const doc of ["cookies", "", undefined, null, "toString", "__proto__", "constructor"]) {
      const { container } = render(<LegalPage doc={doc} onBack={() => {}} />);
      expect(container.firstChild).toBeNull();
      cleanup();
    }
  });

  it("holds no bidi controls or zero-width characters, in the text or on the page", () => {
    expect(hiddenIn(`a${String.fromCodePoint(0x200f)}b`)).toEqual(["200f"]); // the check itself works
    for (const doc of DOCS) {
      for (const lang of LANGUAGES) expect(hiddenIn(allText(LEGAL_DOCS[doc][lang.key]))).toEqual([]);
      const { container } = render(<LegalPage doc={doc} />);
      expect(hiddenIn(container.textContent)).toEqual([]);
      cleanup();
    }
  });

  it("names on the privacy page the providers, where the data is kept, and the right to inspect and correct it", () => {
    const he = render(<LegalPage doc="privacy" />).container.textContent;
    for (const name of ["Supabase", "Vercel", "WhatsApp", "Unsplash", "Gmail", "פרנקפורט", "סעיף 13", "סעיף 14", "התחזית החודשית"]) expect(he).toContain(name);
    // the fonts are the site's own since 2026-10-12 (the owner approved the wording): no request goes to Google for them
    expect(he).toContain("הגופנים נשמרים באתר עצמו");
    expect(he).not.toContain("Google Fonts");
    expect(he).not.toContain("אינה שולחת"); // the account emails go out now (custom SMTP)
    // analytics keeps the page's own name after # (#demo), and nothing else from the fragment
    expect(he).toContain("רק שם העמוד");
    expect(he).not.toContain("או הסולמית (#)");
    // any form of the name: after a prefix such as ב the article ה drops ("באיחוד האירופי", in the EU)
    expect(he).toMatch(/איחוד האירופי|אירופה/);
    expect(he).toContain("לעיין במידע");
    expect(he).toContain("לתקן אותו");
    cleanup();
    const en = render(<LegalPage doc="privacy" he={false} />).container.textContent;
    for (const name of ["Supabase", "Vercel", "WhatsApp", "Unsplash", "Gmail", "Frankfurt", "European Union", "monthly forecast"]) expect(en).toContain(name);
    expect(en).toContain("The fonts are stored on the website itself");
    expect(en).not.toContain("Google Fonts");
    expect(en).toContain("inspect");
    expect(en).toContain("corrected");
  });

  it("has a page for every legal address, and an address for every page", () => {
    expect(Object.keys(LEGAL_DOCS).sort()).toEqual([...LEGAL_HASHES].sort());
    expect([...DOCS].sort()).toEqual([...LEGAL_HASHES].sort());
  });

  it("writes the owner's number as people dial it", () => {
    expect(phoneOf("972524000820", true)).toBe("052-400-0820");
    expect(phoneOf("972524000820", false)).toBe("+972 52-400-0820");
    expect(phoneOf("0524000820", true)).toBe("052-400-0820");
  });

  it("states on the refunds page the price and the trial from the sales config, billed monthly, never 'set at signup'", () => {
    const he = allText(LEGAL_DOCS.refunds.he);
    expect(he).toContain(`${PRICE_MONTHLY} ש"ח לחודש`);
    expect(he).toContain("החיוב הוא חודשי");
    expect(he).toContain(`${TRIAL_DAYS} ימי ניסיון חינם`);
    expect(he).not.toContain("נקבעים בהתקשרות");
    const en = allText(LEGAL_DOCS.refunds.en);
    expect(en).toContain(`${PRICE_MONTHLY} NIS a month, billed monthly`);
    expect(en).toContain(`free ${TRIAL_DAYS}-day trial`);
    expect(en).not.toContain("set in the agreement");
  });

  it("takes a cancellation through every channel the Studio is sold through: email, WhatsApp and phone", () => {
    const how = (lang) => LEGAL_DOCS.refunds[lang].sections.find((s) => s.items?.some((item) => item.includes(LEGAL_EMAIL)));
    expect(how("he").items).toEqual([`בדוא"ל: ${LEGAL_EMAIL}`, `ב-WhatsApp: ${phoneOf(SALES_WHATSAPP, true)}`, `בטלפון: ${phoneOf(SALES_WHATSAPP, true)}`]);
    expect(how("en").items).toEqual([`By email: ${LEGAL_EMAIL}`, `On WhatsApp: ${phoneOf(SALES_WHATSAPP, false)}`, `By phone: ${phoneOf(SALES_WHATSAPP, false)}`]);
    const { container } = render(<LegalPage doc="refunds" />);
    expect(within(container.querySelector("ul")).getByRole("link", { name: LEGAL_EMAIL })).toBeTruthy();
  });

  it("lets an ongoing subscription stop at any time with no fee, billing ending within 3 business days (s.13D)", () => {
    const he = allText(LEGAL_DOCS.refunds.he);
    expect(he).toContain("סעיף 13ד לחוק הגנת הצרכן");
    expect(he).toContain("אפשר להפסיק אותו בכל עת, בלי דמי ביטול");
    expect(he).toContain("החיוב ייפסק בתוך 3 ימי עסקים");
    // the 5% or 100 NIS fee belongs to the first 14 days only
    expect(he).toContain("דמי הביטול האלה חלים רק על ביטול בתוך 14 הימים הראשונים");
    const en = allText(LEGAL_DOCS.refunds.en);
    expect(en).toContain("section 13D of the Consumer Protection Law");
    expect(en).toContain("ended at any time, with no cancellation fee");
    expect(en).toContain("Billing stops within 3 business days");
    expect(en).toContain("applies only to a cancellation within the first 14 days");
  });

  it("binds the operator in the terms to process client data only for the service, keep it confidential, report incidents and delete it", () => {
    const he = allText(LEGAL_DOCS.terms.he);
    for (const phrase of ["רק כדי לתת את השירות, ולפי ההוראות של המנוי", "בסודיות", "בלי דיחוי על כל אירוע אבטחה חמור", "אפשר לייצא את המידע", "בתוך 30 ימים מסיום המנוי", "רק בהסכמת הורה"]) expect(he).toContain(phrase);
    const en = allText(LEGAL_DOCS.terms.en);
    for (const phrase of ["only to provide the Service, and according to the subscriber's instructions", "confidential", "without delay of any serious security incident", "the data can be exported", "within 30 days of the end of the subscription", "only with a parent's consent"]) expect(en).toContain(phrase);
    // the privacy page says the same about deletion
    expect(allText(LEGAL_DOCS.privacy.he)).toContain("נמחק בתוך 30 ימים מסיום המנוי");
    expect(allText(LEGAL_DOCS.privacy.en)).toContain("deleted within 30 days of the end of the subscription");
  });

  it("says on the privacy page which providers store data in the United States, besides Supabase in Frankfurt", () => {
    const items = (lang) => LEGAL_DOCS.privacy[lang].sections.find((s) => s.items?.some((item) => item.startsWith("Supabase"))).items;
    for (const provider of ["Vercel", "Google"]) {
      expect(items("he").find((item) => item.startsWith(provider))).toContain("בארצות הברית");
      expect(items("en").find((item) => item.startsWith(provider))).toContain("United States");
    }
    expect(items("he").find((item) => item.startsWith("Supabase"))).toContain("פרנקפורט");
  });

  it("states on the accessibility page the standard, the honest level, the limitations, the contacts and the date", () => {
    const he = render(<LegalPage doc="accessibility" />).container.textContent;
    for (const phrase of ['ת"י 5568', "WCAG", "AA", "עמידה חלקית", "התשע\"ג-2013", "מגבלות ידועות", "כ-5 שניות", "הפחתת תנועה", phoneOf(SALES_WHATSAPP, true), LEGAL_EMAIL, "30.10.2026"]) expect(he).toContain(phrase);
    expect(screen.getByRole("link", { name: LEGAL_EMAIL })).toBeTruthy();
    cleanup();
    const en = render(<LegalPage doc="accessibility" he={false} />).container.textContent;
    for (const phrase of ["SI 5568", "WCAG", "partially conforms", "Known limitations", "about 5 seconds", "reduce motion", phoneOf(SALES_WHATSAPP, false), LEGAL_EMAIL, "30 October 2026"]) expect(en).toContain(phrase);
  });

  it("gives 14 days to cancel on the refunds page, and the fee cap the law allows", () => {
    const he = render(<LegalPage doc="refunds" />).container.textContent;
    expect(he).toContain("14 ימים");
    expect(he).toContain('5% ממחיר העסקה או 100 ש"ח');
    // the owner's choice: every subscriber may cancel, also one buying for a business, whom the law may not cover
    expect(he).toContain("לכל המנויים");
    expect(he).toContain("בתוך 14 ימים מיום קבלת הודעת הביטול");
    cleanup();
    const en = render(<LegalPage doc="refunds" he={false} />).container.textContent;
    expect(en).toContain("14 days");
    expect(en).toContain("5% of the price or 100 NIS");
    expect(en).toContain("every subscriber");
    expect(en).toContain("within 14 days of receiving the cancellation notice");
  });

  it("shows the operator's legal name after מפעיל השירות once it is set, and nothing in its place while it is not", () => {
    expect(LEGAL_DOCS).toEqual(buildLegalDocs(OPERATOR_NAME));
    const unnamed = buildLegalDocs(null);
    const named = buildLegalDocs("Example Ltd");
    for (const doc of DOCS) {
      const plain = allText(unnamed[doc].he) + allText(unnamed[doc].en);
      expect(plain).toContain("מפעיל השירות");
      expect(plain).not.toMatch(/null|undefined|Example Ltd/);
      expect(allText(named[doc].he)).toContain(`מפעיל השירות, Example Ltd (עוסק פטור ${OPERATOR_ID}).`);
      expect(allText(named[doc].en)).toContain(`the service operator, Example Ltd (exempt dealer no. ${OPERATOR_ID}).`);
    }
  });

  it("names the owner and her exempt-dealer number as the operator on every page", () => {
    for (const doc of DOCS) {
      expect(allText(LEGAL_DOCS[doc].he)).toContain("מפעיל השירות, שני כהן אזולאי (עוסק פטור 305561607)");
      expect(allText(LEGAL_DOCS[doc].he) + allText(LEGAL_DOCS[doc].en)).not.toContain("עדן");
    }
  });

  it("gives each page the same sections in Hebrew and English, each with a title and text, and no placeholders", () => {
    for (const doc of DOCS) {
      const { he, en } = LEGAL_DOCS[doc];
      expect(en.sections.length).toBe(he.sections.length);
      he.sections.forEach((section, i) => expect((en.sections[i].items || []).length).toBe((section.items || []).length));
      for (const page of [he, en]) {
        expect(page.title.trim()).not.toBe("");
        for (const section of page.sections) {
          expect(section.title.trim()).not.toBe("");
          expect(section.paragraphs.length).toBeGreaterThan(0);
        }
        expect(allText(page)).not.toMatch(/TBD|TODO|FIXME|lorem|\?\?/i);
      }
    }
  });

  it("never speaks to the reader in the singular in Hebrew", () => {
    expect(SINGULAR_YOU.test("מה שלך?")).toBe(true); // the check itself works
    for (const doc of DOCS) expect(allText(LEGAL_DOCS[doc].he)).not.toMatch(SINGULAR_YOU);
  });

  it("keeps small text at 4.5:1 contrast or more, and the headings at 3:1 or more, in both themes", () => {
    for (const dk of [true, false]) {
      const { container } = render(<LegalPage doc="privacy" dk={dk} onBack={() => {}} />);
      const background = container.firstChild.style.backgroundColor;
      expect(background).toBeTruthy();
      for (const el of container.querySelectorAll("p, li, a, button")) expect(contrast(colourOf(el), background)).toBeGreaterThanOrEqual(4.5);
      for (const el of container.querySelectorAll("h1, h2")) expect(contrast(colourOf(el), background)).toBeGreaterThanOrEqual(3);
      cleanup();
    }
  });
});
