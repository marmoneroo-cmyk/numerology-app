/**
 * Vercel Web Analytics: page views, no cookies. The script and its reports stay on this site's
 * own address, so the Content-Security-Policy needs nothing added.
 */
import { inject } from "@vercel/analytics";

/**
 * The event as the analytics may see it: the page's origin and path only. A query or fragment
 * could carry a reset token or a client's details; an address that cannot be read is not sent.
 */
export function scrubbed(event) {
  try {
    const url = new URL(event.url);
    return { ...event, url: `${url.origin}${url.pathname}` };
  } catch {
    return null;
  }
}

/**
 * On once Web Analytics is enabled for the project in Vercel (Analytics, then Enable, then a new
 * deployment). Before that the site answers the script's address with its own page, which the
 * browser refuses to run, logging an error on every visit.
 */
const VERCEL_ANALYTICS_ENABLED = false;

/**
 * Starts counting page views in the live build; local runs and tests count nothing. The mode is
 * set rather than guessed, so the live site never loads the debug script from Vercel's own host.
 */
export function startAnalytics({ production = import.meta.env.PROD, enabled = VERCEL_ANALYTICS_ENABLED, load = inject } = {}) {
  if (production && enabled) load({ mode: "production", beforeSend: scrubbed });
}
