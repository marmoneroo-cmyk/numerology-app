// The steps of scripts/prerender.mjs, each a function of the page's text (tested in __tests__/prerender-lib.test.js).
import { createHash } from "node:crypto";

const EMPTY_ROOT = '<div id="root"></div>';
const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const OWN_STYLESHEET = /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g;
// a url() that is neither absolute (/x, https:) nor data: would resolve against the page, not /assets/
const RELATIVE_URL = /url\(\s*["']?(?![/"']|[a-z][a-z0-9+.-]*:)/i;

/** The page with the rendered sales page in its empty root. */
export function fillRoot(page, markup) {
  if (!markup.includes("<h1")) throw new Error("prerender: the sales page rendered without its heading");
  if (!page.includes(EMPTY_ROOT)) throw new Error("prerender: dist/index.html has no empty root to fill");
  return page.replace(EMPTY_ROOT, () => `<div id="root">${markup}</div>`); // a function: "$&" in the markup stays as it is
}

/** The hash of each inline script the policy does not allow: a page whose script the policy blocks must not ship. */
export function blockedInlineScripts(page, policy) {
  return [...page.matchAll(INLINE_SCRIPT)]
    .filter(([, attrs, body]) => !/\bsrc=/.test(attrs) && !/application\/ld\+json/.test(attrs) && body.trim())
    .map(([, , body]) => `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`)
    .filter((hash) => !policy.includes(hash));
}

/**
 * The page with the app's script and its preloads fetched at low priority: the sales page is drawn already, so its
 * picture and fonts come first, and a test run no longer counts the script as holding up the first paint. Where the
 * app opens instead, the script is still the only thing in flight beside a font.
 */
export function lowerAppScripts(page) {
  const lowered = page
    .replace(/<script type="module" crossorigin src="\/assets\//g, '<script type="module" crossorigin fetchpriority="low" src="/assets/')
    .replace(/<link rel="modulepreload" crossorigin href="\/assets\//g, '<link rel="modulepreload" crossorigin fetchpriority="low" href="/assets/');
  if (!lowered.includes('<script type="module" crossorigin fetchpriority="low"')) throw new Error("prerender: no app script to lower in dist/index.html");
  return lowered;
}

/**
 * The page with its own stylesheet written into it (read by `readAsset(href)`), so the first paint waits for no
 * request. The policy allows inline styles ('unsafe-inline' in style-src). A link to the file stays, for no media:
 * Vite's loader adds each stylesheet a lazy part of the app needs unless the page links it already, and added again,
 * after the app's own stylesheet, it would undo that one's rules.
 */
export function inlineStylesheets(page, readAsset) {
  return page.replace(OWN_STYLESHEET, (_, href) => {
    const css = readAsset(href);
    if (/<\/style/i.test(css)) throw new Error(`prerender: ${href} would end its style element early`);
    if (RELATIVE_URL.test(css)) throw new Error(`prerender: ${href} has a relative url(), which would break inside the page`);
    return `<style>${css}</style><link rel="stylesheet" crossorigin href="${href}" media="not all">`;
  });
}
