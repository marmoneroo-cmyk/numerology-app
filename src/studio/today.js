/**
 * Pure helpers for the "היום" home: the birthdays coming up this week, the
 * most recently active clients, and a ready WhatsApp birthday greeting.
 */
import { byActivity } from "../data/store.js";
import { isIsoDate } from "../data/validation.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A full phone number in international form has 9 to 15 digits. */
const MIN_DIGITS = 9;
const MAX_DIGITS = 15;
const ISRAEL = "972";
/** U+FFFD stands in for a damaged character (half of a surrogate pair). */
const REPLACEMENT = String.fromCharCode(0xfffd);
const SURROGATE_FIRST = String.fromCharCode(0xd800);
const SURROGATE_LAST = String.fromCharCode(0xdfff);

/** Whole days since 1970 for the local calendar date of `d`; the hour and clock changes do not count. */
const dayNumber = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;

/** { year, month (0-11), day } of a valid birth date (YYYY-MM-DD, from 1900 to `maxYear`), or null. */
function parseBirthDate(value, maxYear) {
  if (!isIsoDate(value, maxYear)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return { year, month: month - 1, day };
}

/** The birthday in `year` as a local date; 29 February falls on 28 February in a year without one. */
function birthdayIn(year, { month, day }) {
  const date = new Date(year, month, day);
  return date.getMonth() === month ? date : new Date(year, month + 1, 0);
}

/** The first birthday on or after `now`'s date, how many days away it is, and the age turned on it. */
function nextBirthday(birth, now) {
  const today = dayNumber(now);
  const thisYear = birthdayIn(now.getFullYear(), birth);
  const date = dayNumber(thisYear) >= today ? thisYear : birthdayIn(now.getFullYear() + 1, birth);
  return { date, age: date.getFullYear() - birth.year, inDays: dayNumber(date) - today };
}

const byName = (a, b) => String(a.fullName ?? "").localeCompare(String(b.fullName ?? ""), "he");

/**
 * The birthdays from today (0 days away) to `days - 1` days away, soonest
 * first, then by name. Archived clients, missing or invalid dates, and births
 * that have not come yet are left out.
 * @param {object[]} clients
 * @param {Date} now
 * @returns {{client: object, date: Date, age: number, inDays: number}[]}
 */
export function upcomingBirthdays(clients, now, days = 7) {
  return clients
    .flatMap((client) => {
      const birth = client.archived ? null : parseBirthDate(client.birthDate, now.getFullYear());
      if (!birth) return [];
      const next = nextBirthday(birth, now);
      return next.inDays < days && next.age > 0 ? [{ client, ...next }] : [];
    })
    .sort((a, b) => a.inDays - b.inDays || byName(a.client, b.client));
}

/** The `count` most recently active clients (an edit or a saved reading), newest first; archived ones are left out. */
export function recentClients(clients, count = 4) {
  return clients.filter((c) => !c.archived).sort(byActivity).slice(0, count);
}

/** The digits of `phone` in international form: 0... becomes 972..., a 00 prefix goes, and so does a 0 typed right after 972. */
function internationalDigits(phone) {
  const digits = String(phone ?? "").replace(/[^0-9]/g, "");
  const full = digits.startsWith("00") ? digits.slice(2) : digits.startsWith("0") ? ISRAEL + digits.slice(1) : digits;
  return full.startsWith(`${ISRAEL}0`) ? ISRAEL + full.slice(ISRAEL.length + 1) : full;
}

/** `text` with every unpaired surrogate replaced, so encodeURIComponent cannot throw on a damaged name. */
const wellFormed = (text) =>
  Array.from(String(text ?? ""), (ch) => (ch.length === 1 && ch >= SURROGATE_FIRST && ch <= SURROGATE_LAST ? REPLACEMENT : ch)).join("");

/** A WhatsApp link that opens a chat with `phone`, or null when the phone cannot be a full number. */
export function whatsappLink(phone) {
  const digits = internationalDigits(phone);
  return digits.length < MIN_DIGITS || digits.length > MAX_DIGITS ? null : `https://wa.me/${digits}`;
}

/**
 * A WhatsApp link that opens a chat with `phone`, the greeting already typed,
 * or null when the phone cannot be a full number.
 */
export function greetingLink(phone, text) {
  const chat = whatsappLink(phone);
  return chat && `${chat}?text=${encodeURIComponent(wellFormed(text))}`;
}

const wordsOf = (name) => String(name ?? "").split(" ").filter(Boolean);

/** The birthday greeting, by first name. */
export function greetingText(fullName, he) {
  const first = wordsOf(fullName)[0];
  const to = first ? `, ${first}` : "";
  return he
    ? `יום הולדת שמח${to}! מאחלים לך שנה של אור, צמיחה והגשמה.`
    : `Happy birthday${to}! Wishing you a year of light, growth and fulfilment.`;
}

/** Up to two initials: the first letters of the first and the last name. */
export function initialsOf(fullName) {
  const words = wordsOf(fullName);
  const ends = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return ends.map((w) => Array.from(w)[0]).join("").toUpperCase();
}
