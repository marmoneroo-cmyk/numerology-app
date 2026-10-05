/** Display helpers for the workspace: dates, labels and one-line summaries. */
import { isIsoDate } from "../data/validation.js";

const pad2 = (n) => String(n).padStart(2, "0");

/** "15.08.1990" (or 15/8/1990, 15-8-1990) -> "1990-08-15"; null when it is not a real date. */
export function parseDmy(text, maxYear = new Date().getFullYear() + 1) {
  const m = String(text || "").trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;
  return isIsoDate(iso, maxYear) ? iso : null;
}

/** "1990-08-15" -> "15.08.1990"; "" for nothing. */
export const formatDmy = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

/** An ISO timestamp as a local date, "5.10.2026". */
export function formatStamp(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

/** The engine's person: birth date split into numbers, plus the name to calculate with. */
export function personOf(name, birthDate) {
  const [y, m, d] = birthDate.split("-").map(Number);
  return { d, m, y, name };
}

export function readingTypeLabel(type, he) {
  const labels = {
    map: ["מפה נומרולוגית", "Numerology map"],
    match: ["התאמה", "Compatibility"],
    parentChild: ["הורה-ילד", "Parent-child"],
    yearCycle: ["מחזור שנים", "Year cycle"],
  };
  const l = labels[type] || [type, type];
  return he ? l[0] : l[1];
}

export function matchTypeLabel(type, he) {
  const labels = { love: ["זוגית", "love"], twin: ["להבה תאומה", "twin flame"], biz: ["עסקית", "business"], parent: ["הורה-ילד", "parent-child"] };
  const l = labels[type] || labels.love;
  return he ? l[0] : l[1];
}

/** A person in a saved reading; a deleted client's details were wiped, so they show as "(נמחק)". */
export const personName = (p, he) => (p && p.name ? p.name : he ? "(נמחק)" : "(deleted)");

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** One line for a reading in a history list. Never throws, even for a damaged reading. */
export function summarizeReading(reading, he) {
  try {
    const line = summaryLine(reading, he);
    if (line) return line;
  } catch {
    /* damaged reading: say so below */
  }
  return he ? "לא ניתן להציג את הסיכום" : "Summary unavailable";
}

function summaryLine({ type, result: r, input }, he) {
  if (type === "map" && [r.lp, r.nv, r.py].every(isNum)) {
    return he ? `שביל הגורל ${r.lp} · ערך השם ${r.nv} · שנה אישית ${r.py}` : `Life path ${r.lp} · name ${r.nv} · personal year ${r.py}`;
  }
  if (type === "match" && isNum(r.score)) {
    const kind = matchTypeLabel(input.matchType, he);
    const other = personName(input.other, he);
    return he ? `${r.score}% התאמה ${kind} עם ${other}` : `${r.score}% ${kind} match with ${other}`;
  }
  if (type === "parentChild" && isNum(r.score)) {
    const other = personName(input.other, he);
    return he ? `${r.score}% חיבור עם ${other}` : `${r.score}% connection with ${other}`;
  }
  if (type === "yearCycle" && Array.isArray(r.proj) && r.proj.length > 0) {
    const first = r.proj[0].year;
    const last = r.proj[r.proj.length - 1].year;
    if (isNum(first) && isNum(last)) return he ? `שנים אישיות ${first}–${last}` : `Personal years ${first}–${last}`;
  }
  return null;
}

const COUNTS = {
  clients: [["לקוח אחד", "לקוחות"], ["1 client", "clients"]],
  readings: [["בדיקה אחת", "בדיקות"], ["1 reading", "readings"]],
  savedReadings: [["בדיקה שמורה אחת", "בדיקות שמורות"], ["1 saved reading", "saved readings"]],
  files: [["קובץ אחד", "קבצים"], ["1 file", "files"]],
  errors: [["שגיאה אחת", "שגיאות"], ["1 error", "errors"]],
};

/** A count in natural language: "לקוח אחד", "3 לקוחות". */
export function countLabel(n, kind, he) {
  const [one, many] = COUNTS[kind][he ? 0 : 1];
  return n === 1 ? one : `${n} ${many}`;
}

/** 1536 -> "1.5 KB". */
export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Hebrew / English text for a validation error code. */
export function errorText(field, code, he) {
  const msgs = {
    "fullName.required": ["חובה למלא שם", "Name is required"],
    "fullName.tooLong": ["השם ארוך מדי", "Name is too long"],
    "birthName.tooLong": ["שם הלידה ארוך מדי", "Birth name is too long"],
    "birthDate.invalid": ["תאריך לא תקין (dd.mm.yyyy)", "Invalid date (dd.mm.yyyy)"],
    "phone.invalid": ["מספר טלפון לא תקין", "Invalid phone number"],
    "email.invalid": ["כתובת מייל לא תקינה", "Invalid email address"],
    "tags.tooMany": ["יותר מדי תגיות (עד 12)", "Too many tags (max 12)"],
    "tags.tooLong": ["תגית ארוכה מדי (עד 30 תווים)", "Tag too long (max 30)"],
    "notes.tooLong": ["ההערות ארוכות מדי", "Notes are too long"],
    "followUp.invalid": ["תאריך מעקב לא תקין", "Invalid follow-up date"],
    "title.tooLong": ["הכותרת ארוכה מדי", "Title is too long"],
    "size.tooLarge": ["הקובץ גדול מ-20MB", "File is larger than 20 MB"],
  };
  const m = msgs[`${field}.${code}`];
  return m ? (he ? m[0] : m[1]) : he ? "ערך לא תקין" : "Invalid value";
}
