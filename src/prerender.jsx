/**
 * The sales page as HTML, for the build (scripts/prerender.mjs writes it into dist/index.html). The page then
 * shows and can be read before any script runs: search engines and link previews get its words, and a phone
 * draws it at once. It is exactly what Root shows first at the plain address (the Hebrew sales page), so the
 * browser takes it over without drawing it again (main.jsx).
 */
import { renderToString } from "react-dom/server";
import SalesPage from "./sales/SalesPage.jsx";

/** @returns {string} the sales page's markup, for inside <div id="root"> */
export function render() {
  return renderToString(<SalesPage he onLanguage={() => {}} />);
}
