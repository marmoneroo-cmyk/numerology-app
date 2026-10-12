/**
 * Pure helpers for the "היום" home: the birthdays coming up this week, the
 * most recently active clients, and a ready WhatsApp birthday greeting.
 */
import { byActivity, lastActive } from "../data/store.js";
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

/** A WhatsApp link with `text` typed and no one chosen: WhatsApp asks whom to send it to (the demo's sample clients). */
export function shareLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(wellFormed(text))}`;
}

const wordsOf = (name) => String(name ?? "").split(" ").filter(Boolean);

/** What each personal year brings, for the birthday greeting (the themes of App's YEAR_ENERGY, in plain words). */
const YEAR_WISH = {
  1: { he: "שנה של התחלות חדשות ואומץ לפעול", en: "a year of new beginnings and the courage to act" },
  2: { he: "שנה של שיתוף, קשרים וסבלנות שמשתלמת", en: "a year of partnership, connection and patience that pays off" },
  3: { he: "שנה של ביטוי, יצירה ושמחה", en: "a year of expression, creativity and joy" },
  4: { he: "שנה של בנייה ויסודות יציבים", en: "a year of building and steady foundations" },
  5: { he: "שנה של שינוי, חופש והרפתקאות", en: "a year of change, freedom and adventure" },
  6: { he: "שנה של אהבה, משפחה ובית", en: "a year of love, family and home" },
  7: { he: "שנה של העמקה, חוכמה פנימית ושקט", en: "a year of depth, inner wisdom and calm" },
  8: { he: "שנה של כוח, הצלחה והגשמה", en: "a year of strength, success and achievement" },
  9: { he: "שנה של סיום מעגל, שחרור ופינוי מקום לחדש", en: "a year of closing a circle, letting go and making room for the new" },
};

const withSignature = (text, signature) => {
  const sign = String(signature ?? "").trim();
  return sign ? `${text}\n${sign}` : text;
};
const wishFor = (personalYear) => (typeof personalYear === "number" && Object.hasOwn(YEAR_WISH, personalYear) ? YEAR_WISH[personalYear] : null);
const hiTo = (fullName, he) => {
  const first = wordsOf(fullName)[0];
  return he ? `היי${first ? ` ${first}` : ""}` : `Hi${first ? ` ${first}` : ""}`;
};

// The Hebrew messages to clients are impersonal: no singular "you" (שלך, לך, שלומך), whoever the client is.

/** After a session: asks how things are, and offers a follow-up meeting. */
export function followUpText(fullName, he, { signature } = {}) {
  const text = he
    ? `${hiTo(fullName, true)}, רציתי לשאול מה נשמע מאז הפגישה שלנו. אם מתאים, אפשר לקבוע פגישת המשך.`
    : `${hiTo(fullName, false)}, I wanted to ask how you are since our session. If it suits you, we can book a follow-up.`;
  return withSignature(text, signature);
}

/** To a client with no activity for a long while: the personal year now, and an offer to meet. */
export function checkInText(fullName, he, { personalYear, signature } = {}) {
  const wish = wishFor(personalYear);
  let text;
  if (he) {
    const year = wish ? ` בנומרולוגיה, עכשיו זו שנה אישית ${personalYear} — ${wish.he}.` : "";
    text = `${hiTo(fullName, true)}, מזמן לא דיברנו!${year} אם מתאים, אפשר לקבוע פגישה ולראות יחד מה מחכה בהמשך.`;
  } else {
    const year = wish ? ` In numerology, your personal year now is ${personalYear} — ${wish.en}.` : "";
    text = `${hiTo(fullName, false)}, it has been a while!${year} If it suits you, we can meet and see what is ahead.`;
  }
  return withSignature(text, signature);
}

/** In January, when every personal year moves on: the new year, and an offer to meet. */
export function newYearText(fullName, he, { personalYear, signature } = {}) {
  const wish = wishFor(personalYear);
  let text;
  if (he) {
    const year = wish ? `: ${personalYear} — ${wish.he}` : "";
    text = `${hiTo(fullName, true)}, שנה אישית חדשה התחילה${year}. אם מתאים, אפשר לקבוע פגישה ולראות יחד מה היא מביאה.`;
  } else {
    const year = wish ? `: ${personalYear} — ${wish.en}` : "";
    text = `${hiTo(fullName, false)}, your new personal year has begun${year}. If it suits you, we can meet and see what it brings.`;
  }
  return withSignature(text, signature);
}

/** January: every client's personal year moves on with the calendar year (no +1 since 2026-10-12, the owner). */
export const isNewYearMonth = (now) => now.getMonth() === 0;

/** Half a year, in days: a client quiet this long is worth a word. */
export const QUIET_DAYS = 182;

/**
 * The clients with no activity (no edit and no saved reading) for `days` days or more, the longest quiet
 * first, with the months since, rounded; archived ones are left out.
 * @returns {{client: object, months: number}[]}
 */
export function quietClients(clients, now, { days = QUIET_DAYS, count = 5 } = {}) {
  const limit = now.getTime() - days * DAY_MS;
  return clients
    .filter((c) => !c.archived && Date.parse(lastActive(c)) <= limit)
    .sort((a, b) => byActivity(b, a))
    .slice(0, count)
    .map((client) => ({ client, months: Math.round((now.getTime() - Date.parse(lastActive(client))) / (30.44 * DAY_MS)) }));
}

/**
 * The birthday greeting, by first name. Given the personal year the client enters on the birthday,
 * it says what that year brings; given a signature (the studio's name), it ends with it.
 */
export function greetingText(fullName, he, { personalYear, signature } = {}) {
  const first = wordsOf(fullName)[0];
  const to = first ? `, ${first}` : "";
  const wish = wishFor(personalYear);
  let text;
  if (!wish) {
    text = he
      ? `יום הולדת שמח${to}! מאחלים שנה של אור, צמיחה והגשמה.`
      : `Happy birthday${to}! Wishing you a year of light, growth and fulfilment.`;
  } else if (he) {
    text = `יום הולדת שמח${to}!\nבנומרולוגיה, זו שנה אישית ${personalYear} — ${wish.he}.\nמאחלים שנה מלאה באור ובהגשמה.`;
  } else {
    text = `Happy birthday${to}!\nIn numerology, your personal year is ${personalYear} — ${wish.en}.\nWishing you a year full of light and fulfilment.`;
  }
  return withSignature(text, signature);
}

/** Up to two initials: the first letters of the first and the last name. */
export function initialsOf(fullName) {
  const words = wordsOf(fullName);
  const ends = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return ends.map((w) => Array.from(w)[0]).join("").toUpperCase();
}
