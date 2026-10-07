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
 * Starts counting page views in the live build; local runs and tests count nothing. The mode is
 * set rather than guessed, so the live site never loads the debug script from Vercel's own host.
 */
export function startAnalytics({ production = import.meta.env.PROD, load = inject } = {}) {
  if (production) load({ mode: "production", beforeSend: scrubbed });
}
