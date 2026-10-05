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

/** The readings the workspace can save, one per engine reading. */
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

/**
 * A saved reading: what was asked (input), what the engine answered (result),
 * which rules answered (engineVersion) and for which date (computedFor).
 */
export function validateReading(input, { today = new Date() } = {}) {
  const c = collector();
  const clientId = text(input.clientId);
  if (!clientId) c.fail("clientId", "required");
  if (!READING_TYPES.includes(input.type)) c.fail("type", "invalid");

  const title = text(input.title);
  if (title.length > LIMITS.title) c.fail("title", "tooLong");
  if (!isPlainObject(input.input)) c.fail("input", "invalid");
  if (!isPlainObject(input.result)) c.fail("result", "invalid");

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
    clientId, type: input.type, title, input: input.input, result: input.result,
    engineVersion, computedFor, notes, followUp,
  });
}

/** File metadata. The name loses any path a browser prepends ("C:\fakepath\..."). */
export function validateAttachment(input) {
  const c = collector();
  const clientId = text(input.clientId);
  if (!clientId) c.fail("clientId", "required");
  const readingId = text(input.readingId) || null;

  const name = text(String(input.name ?? "").split(/[\\/]/).pop()).replace(/[\u0000-\u001f]/g, "").slice(0, LIMITS.fileName);
  if (!name) c.fail("name", "required");

  const type = text(input.type).slice(0, LIMITS.mime);
  const size = Number(input.size);
  if (!Number.isFinite(size) || size < 0) c.fail("size", "invalid");
  else if (size > LIMITS.attachmentBytes) c.fail("size", "tooLarge");

  return c.done({ clientId, readingId, name, type, size });
}
