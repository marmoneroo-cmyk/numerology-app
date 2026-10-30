/**
 * The browser tab's title for each view, so a tab, a bookmark and a screen reader name the page that is open, not
 * the sales page every hash shares. The sales page keeps index.html's own title (the prerendered one).
 */
import { LEGAL_DOCS } from "./legal/content.js";
import { SALES } from "./sales/content.js";

/** index.html's <title>, and its English counterpart for the sales page in English. */
export const SALES_TITLE = {
  he: "תוכנה לנומרולוגים: ניהול לקוחות ומפה מלאה | הסטודיו",
  en: "Software for numerologists: client management and the full map | The Studio",
};

/** The views that name themselves in the title; any other view shows the sales page's title. */
const VIEW_NAMES = { demo: { he: "הדגמה", en: "Demo" } };

/**
 * The title for a route (see routes.js nextRoute): "תנאי שימוש · הסטודיו" on #terms, "הדגמה · הסטודיו" on #demo,
 * "הסטודיו" in the Studio, and the sales page's own title elsewhere.
 * @param {{ world: "sales" | "app", view: string, legal: string | null }} route
 * @param {boolean} he
 * @returns {string}
 */
export function pageTitle(route, he) {
  const lang = he ? "he" : "en";
  const brand = SALES[lang].brand;
  const legal = route?.legal && Object.hasOwn(LEGAL_DOCS, route.legal) ? LEGAL_DOCS[route.legal][lang].title : null;
  if (legal) return `${legal} · ${brand}`;
  if (route?.world === "app" && route.view === "studio") return brand;
  const view = route?.world === "app" && Object.hasOwn(VIEW_NAMES, route.view) ? VIEW_NAMES[route.view][lang] : null;
  return view ? `${view} · ${brand}` : SALES_TITLE[lang];
}
