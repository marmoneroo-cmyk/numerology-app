/**
 * Vercel Web Analytics: page views, no cookies. The script and its reports stay on this site's
 * own address, so the Content-Security-Policy needs nothing added.
 */
import { inject } from "@vercel/analytics";
import { ROUTE_HASHES } from "./routes.js";

/**
 * The event as the analytics may see it: the page's origin and path, and its hash only when that is one of
 * the app's own route names (#demo, #studio...), so the sales page and the demo count apart. Any other query
 * or fragment could carry a reset token or a client's details; an address that cannot be read is not sent.
 */
export function scrubbed(event) {
  try {
    const url = new URL(event.url);
    const name = url.hash.slice(1);
    const hash = ROUTE_HASHES.includes(name) ? `#${name}` : "";
    return { ...event, url: `${url.origin}${url.pathname}${hash}` };
  } catch {
    return null;
  }
}

/**
 * Web Analytics is enabled for the project in Vercel (2026-10-07). Turning it off there needs this
 * off too: the site would answer the script's address with its own page, which the browser refuses
 * to run, logging an error on every visit.
 */
const VERCEL_ANALYTICS_ENABLED = true;

/**
 * Starts counting page views in the live build; local runs and tests count nothing. The mode is
 * set rather than guessed, so the live site never loads the debug script from Vercel's own host.
 */
export function startAnalytics({ production = import.meta.env.PROD, enabled = VERCEL_ANALYTICS_ENABLED, load = inject } = {}) {
  if (production && enabled) load({ mode: "production", beforeSend: scrubbed });
}
