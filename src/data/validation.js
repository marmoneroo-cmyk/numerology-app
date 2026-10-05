/**
 * Input rules for the workspace data. Every write to the store goes through
 * one of these validators, so the rules hold for every backend (this device
 * today, the server later). They return a normalised copy holding only known
 * fields, or throw a ValidationError listing every problem at once.
 */

export const LIMITS = Object.freeze({
  name: 120,
  phone: 25,
  email: 254,
  tag: 30,
  tags: 12,
  notes: 20000,
  title: 120,
  fileName: 120,
  mime: 100,
  attachmentBytes: 20 * 1024 * 1024,
});

/** The readings the workspace can save, one per engine reading (shapes below). */
export const READING_TYPES = Object.freeze(["map", "match", "parentChild", "yearCycle"]);

export class ValidationError extends Error {
  /** @param {{field: string, code: string}[]} errors */
  constructor(errors) {
    super("Invalid input: " + errors.map((e) => `${e.field}.${e.code}`).join(", "));
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/** A real calendar date written "YYYY-MM-DD", in the years 1900..maxYear. */
export function isIsoDate(s, maxYear = new Date().getFullYear() + 1) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1900 || y > maxYear) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const text = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const PHONE = /^[+]?[0-9()\- ]{3,}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Collects problems; `done(value)` returns the value or throws them all. */
function collector() {
  const errors = [];
  return {
    fail: (field, code) => errors.push({ field, code }),
    done(value) {
      if (errors.length) throw new ValidationError(errors);
      return value;
    },
  };
}

function normaliseTags(raw, c) {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const tags = [...new Set(list.map(text).filter(Boolean))];
  if (tags.length > LIMITS.tags) c.fail("tags", "tooMany");
  if (tags.some((t) => t.length > LIMITS.tag)) c.fail("tags", "tooLong");
  return tags;
}

/**
 * A client file. Only the name is required; the birth date is needed later,
 * to run a reading.
 */
export function validateClient(input, { today = new Date() } = {}) {
  const c = collector();
  const fullName = text(input.fullName);
  if (!fullName) c.fail("fullName", "required");
  else if (fullName.length > LIMITS.name) c.fail("fullName", "tooLong");

  const birthName = text(input.birthName);
  if (birthName.length > LIMITS.name) c.fail("birthName", "tooLong");

  const rawDate = text(input.birthDate);
  const birthDate = rawDate || null;
  if (birthDate && !isIsoDate(birthDate, today.getFullYear() + 1)) c.fail("birthDate", "invalid");

  const phone = text(input.phone);
  if (phone && (phone.length > LIMITS.phone || !PHONE.test(phone))) c.fail("phone", "invalid");

  const email = text(input.email);
  if (email && (email.length > LIMITS.email || !EMAIL.test(email))) c.fail("email", "invalid");

  const tags = normaliseTags(input.tags, c);

  const notes = text(input.notes);
  if (notes.length > LIMITS.notes) c.fail("notes", "tooLong");

  return c.done({
    fullName, birthName, birthDate, phone, email, tags, notes,
    consent: input.consent === true,
    archived: input.archived === true,
  });
}

// ---------- reading snapshots: exact shapes per type ----------
// A snapshot is rebuilt from its known fields only, so an odd or hostile value
// (from a restored backup, say) can neither crash a screen nor smuggle data in.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isNums = (a, len, max = 40) => Array.isArray(a) && (len === undefined ? a.length <= max : a.length === len) && a.every(isNum);
const isStr = (v, max) => typeof v === "string" && v.length <= max;
const MAX_SNAPSHOT_CHARS = 64 * 1024;

/** A person inside a snapshot. A deleted client's details are wiped to an empty name and no date. */
function person(p) {
  if (!isPlainObject(p) || !isStr(p.name, LIMITS.name)) return null;
  const birthDate = p.birthDate ?? null;
  if (birthDate !== null && !isIsoDate(birthDate, 3000)) return null;
  const clientId = p.clientId ?? null;
  if (clientId !== null && !isStr(clientId, 100)) return null;
  return { name: p.name, birthDate, clientId };
}

function yearList(proj) {
  if (!Array.isArray(proj) || proj.length === 0 || proj.length > 40) return null;
  const out = proj.map((p) => (isPlainObject(p) && isNum(p.year) && isNum(p.py) ? { year: p.year, py: p.py, isCurrent: p.isCurrent === true } : null));
  return out.every(Boolean) ? out : null;
}

function insightList(list) {
  if (!Array.isArray(list) || list.length > 20) return null;
  const out = list.map((x) => (isPlainObject(x) && isStr(x.icon, 40) && isStr(x.t, 200) && isStr(x.d, 600) ? { icon: x.icon, t: x.t, d: x.d } : null));
  return out.every(Boolean) ? out : null;
}

function pickNums(obj, keys) {
  if (!isPlainObject(obj) || !keys.every((k) => isNum(obj[k]))) return null;
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}

const MAP_SCALARS = ["nv", "lp", "age", "py", "hy", "su", "ex", "pm", "pd", "exit", "d", "m", "y"];
const MATCH_KEYS = ["lp1", "lp2", "nv1", "nv2", "su1", "su2", "ex1", "ex2", "lpm1", "lpm2", "score", "harmony", "tension", "growth"];
const PARENT_KEYS = ["lpP", "lpC", "nvP", "nvC", "suP", "suC", "score"];
const MATCH_TYPES = ["love", "twin", "biz", "parent"];

function mapResult(r) {
  const scalars = pickNums(r, MAP_SCALARS);
  if (!scalars || !["pk", "ch", "hp", "hc"].every((k) => isNums(r[k], 4)) || !isNums(r.kd, undefined, 10)) return null;
  const ls = r.ls;
  if (!isPlainObject(ls) || !isPlainObject(ls.g) || !isNums(ls.miss, undefined, 9) || !Array.isArray(ls.planes) || ls.planes.length > 3 || !ls.planes.every((p) => isStr(p, 20))) return null;
  const g = pickNums(ls.g, ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  const proj = yearList(r.proj);
  if (!g || !proj || !isPlainObject(r.psych)) return null;
  const psychEntries = Object.entries(r.psych);
  if (psychEntries.length > 12 || !psychEntries.every(([k, v]) => isStr(k, 30) && isNum(v))) return null;
  const out = { ...scalars, pk: r.pk, ch: r.ch, hp: r.hp, hc: r.hc, kd: r.kd, ls: { g, miss: ls.miss, planes: ls.planes }, proj, psych: Object.fromEntries(psychEntries) };
  if (r.insights !== undefined) {
    const he = isPlainObject(r.insights) && insightList(r.insights.he);
    const en = isPlainObject(r.insights) && insightList(r.insights.en);
    if (!he || !en) return null;
    out.insights = { he, en };
  }
  return out;
}

const SNAPSHOTS = {
  map: {
    input: (i) => (isPlainObject(i) && isStr(i.name, LIMITS.name) && isIsoDate(i.birthDate, 3000) ? { name: i.name, birthDate: i.birthDate, add: i.add === true } : null),
    result: mapResult,
  },
  match: {
    input: (i) => {
      const p = isPlainObject(i) && person(i.person);
      const o = isPlainObject(i) && person(i.other);
      return p && p.birthDate && o && MATCH_TYPES.includes(i.matchType) ? { person: p, other: o, matchType: i.matchType } : null;
    },
    result: (r) => {
      const nums = pickNums(r, MATCH_KEYS);
      if (!nums || !(r.type === undefined || MATCH_TYPES.includes(r.type))) return null;
      return r.type === undefined ? nums : { ...nums, type: r.type };
    },
  },
  parentChild: {
    input: (i) => {
      const p = isPlainObject(i) && person(i.person);
      const o = isPlainObject(i) && person(i.other);
      return p && p.birthDate && o && (i.role === "parent" || i.role === "child") ? { person: p, other: o, role: i.role } : null;
    },
    result: (r) => pickNums(r, PARENT_KEYS),
  },
  yearCycle: {
    input: (i) => (isPlainObject(i) && isIsoDate(i.birthDate, 3000) ? { birthDate: i.birthDate, add: i.add === true } : null),
    result: (r) => {
      const proj = isPlainObject(r) && yearList(r.proj);
      return proj ? { proj } : null;
    },
  },
};

/**
 * A saved reading: what was asked (input), what the engine answered (result),
 * which rules answered (engineVersion) and for which date (computedFor).
 * Input and result are checked against the exact shape of their type and
 * rebuilt from known fields only.
 */
export function validateReading(input, { today = new Date() } = {}) {
  const c = collector();
  const clientId = text(input.clientId);
  if (!clientId) c.fail("clientId", "required");
  // checked against the list, not looked up: "constructor" or "__proto__" would find inherited members
  const shape = READING_TYPES.includes(input.type) ? SNAPSHOTS[input.type] : null;
  if (!shape) c.fail("type", "invalid");

  const title = text(input.title);
  if (title.length > LIMITS.title) c.fail("title", "tooLong");
  const snapshotInput = shape ? shape.input(input.input) : null;
  const snapshotResult = shape ? shape.result(input.result) : null;
  if (shape && !snapshotInput) c.fail("input", "invalid");
  if (shape && !snapshotResult) c.fail("result", "invalid");
  if (snapshotInput && snapshotResult && JSON.stringify([snapshotInput, snapshotResult]).length > MAX_SNAPSHOT_CHARS) c.fail("result", "tooLarge");

  const engineVersion = text(input.engineVersion);
  if (!engineVersion) c.fail("engineVersion", "required");

  const computedFor = text(input.computedFor);
  if (!computedFor || Number.isNaN(Date.parse(computedFor))) c.fail("computedFor", "invalid");

  const notes = text(input.notes);
  if (notes.length > LIMITS.notes) c.fail("notes", "tooLong");

  const rawFollowUp = text(input.followUp);
  const followUp = rawFollowUp || null;
  if (followUp && !isIsoDate(followUp, today.getFullYear() + 10)) c.fail("followUp", "invalid");

  return c.done({
    clientId, type: input.type, title, input: snapshotInput, result: snapshotResult,
    engineVersion, computedFor, notes, followUp,
  });
}

/** File metadata. The name loses any path a browser prepends ("C:\fakepath\..."). */
export function validateAttachment(input) {
  const c = collector();
  const clientId = text(input.clientId);
  if (!clientId) c.fail("clientId", "required");
  const readingId = text(input.readingId) || null;

  // Drop the path a browser prepends, and every control/format character:
  // a RIGHT-TO-LEFT OVERRIDE (U+202E) can make "invoice<U+202E>gpj.exe" display as "invoiceexe.jpg".
  const name = text(String(input.name ?? "").split(/[\\/]/).pop().replace(/[\p{Cc}\p{Cf}]/gu, "")).slice(0, LIMITS.fileName);
  if (!name) c.fail("name", "required");

  const type = text(input.type).slice(0, LIMITS.mime);
  const size = Number(input.size);
  if (!Number.isFinite(size) || size < 0) c.fail("size", "invalid");
  else if (size > LIMITS.attachmentBytes) c.fail("size", "tooLarge");

  return c.done({ clientId, readingId, name, type, size });
}
