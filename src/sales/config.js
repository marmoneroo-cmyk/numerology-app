/**
 * The facts on the sales page that the owner decides. Each null leaves out, or words differently, the part
 * that needs it, so the page never shows a blank.
 */
import { BUSINESS_EMAIL } from "../business.js";

/** The owner's WhatsApp number for questions about the Studio: digits only, with the country code (972...). */
export const SALES_WHATSAPP = null;
/** The monthly price, in shekels. */
export const PRICE_MONTHLY = null;
/** Days of free trial. */
export const TRIAL_DAYS = null;

/**
 * How to reach the owner: WhatsApp when there is a well-formed number, else an email, else nothing.
 * @returns {{ kind: "whatsapp" | "email", href: string } | null}
 */
export function contactLink(he, { whatsapp = SALES_WHATSAPP, email = BUSINESS_EMAIL } = {}) {
  if (whatsapp && /^[1-9][0-9]{7,14}$/.test(whatsapp)) {
    const text = he ? "היי, אשמח לשמוע על הסטודיו לנומרולוגים" : "Hi, I would like to hear about the Studio";
    return { kind: "whatsapp", href: `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}` };
  }
  if (email) return { kind: "email", href: `mailto:${email}?subject=${encodeURIComponent(he ? "הסטודיו לנומרולוגים" : "The Studio")}` };
  return null;
}
