/**
 * The workspace store: client files, saved readings, attachments, summary and
 * backup, over any backend (IndexedDB on this device today; the server later
 * implements the same API and passes the same contract tests).
 *
 * All the rules live here, none in the backends: validation, ids, timestamps,
 * search, cascading deletes, and what may be edited. A saved reading's
 * snapshot (input, result, engineVersion, computedFor) can never be edited.
 * Every change runs under the write lock, and every change that touches more
 * than one record goes through backend.batch, so it happens completely or not
 * at all and never interleaves with another change.
 */
import { validateClient, validateReading, validateAttachment, ValidationError } from "./validation.js";
import { toBytes } from "./bytes.js";
import { backupOf } from "./backup.js";
import { writeLock } from "./lock.js";

export { BACKUP_FORMAT } from "./backup.js";

export class NotFoundError extends Error {
  constructor(kind, id) {
    super(`${kind} not found: ${id}`);
    this.name = "NotFoundError";
    this.kind = kind;
    this.id = id;
  }
}

/** The only fields of a saved reading that may change after it is saved. */
const READING_EDITABLE = ["title", "notes", "followUp"];
/** What remains of a person in other clients' readings once their own file is deleted. */
export const WIPED_PERSON = Object.freeze({ name: "", birthDate: null, clientId: null });

const pad2 = (n) => String(n).padStart(2, "0");
/** Local calendar date as YYYY-MM-DD. */
export const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const newestFirst = (key) => (a, b) => (a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0);
const lower = (s) => String(s || "").toLowerCase();
const digitsOf = (s) => String(s || "").replace(/\D/g, "");

/** When the client was last touched: edited, or a reading saved. The list sorts by it. */
export const lastActive = (c) => (c.lastActivityAt && c.lastActivityAt > c.updatedAt ? c.lastActivityAt : c.updatedAt);
export const byActivity = (a, b) => (lastActive(a) < lastActive(b) ? 1 : lastActive(a) > lastActive(b) ? -1 : 0);

/** RFC 4122 v4 id. crypto.randomUUID needs a secure context; getRandomValues does not. */
export function randomId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Name, birth name, email or tag contains the query; or the phone holds its digits. */
function matches(client, query) {
  const q = lower(query).trim();
  if (!q) return true;
  if ([client.fullName, client.birthName, client.email, ...client.tags].some((f) => lower(f).includes(q))) return true;
  const qDigits = digitsOf(q);
  return qDigits.length >= 3 && digitsOf(client.phone).includes(qDigits);
}

/**
 * @param {object} backend memoryBackend() or idbBackend()
 * @param {{now?: () => Date, newId?: () => string, lock?: (fn: () => Promise<any>) => Promise<any>}} [opts]
 *   injectable clock, ids and write lock
 */
export function createStore(backend, { now = () => new Date(), newId = randomId, lock = writeLock } = {}) {
  const stamp = () => now().toISOString();
  /** `fn` as a change: run while holding the write lock. */
  const change = (fn) => (...args) => lock(() => fn(...args));

  async function getClient(id) {
    const c = await backend.get("clients", id);
    if (!c) throw new NotFoundError("client", id);
    return c;
  }
  async function getReading(id) {
    const r = await backend.get("readings", id);
    if (!r) throw new NotFoundError("reading", id);
    return r;
  }
  const readingsOf = async (clientId) =>
    (await backend.all("readings")).filter((r) => r.clientId === clientId).sort(newestFirst("createdAt"));
  const attachmentsOf = async (clientId) =>
    (await backend.all("attachments")).filter((a) => a.clientId === clientId).sort(newestFirst("createdAt"));

  const clients = {
    async list({ search = "", includeArchived = false } = {}) {
      return (await backend.all("clients")).filter((c) => (includeArchived || !c.archived) && matches(c, search)).sort(byActivity);
    },
    get: getClient,
    create: change(async (input) => {
      const value = validateClient(input, { today: now() });
      const t = stamp();
      const client = { id: newId(), ...value, createdAt: t, updatedAt: t, lastActivityAt: t };
      await backend.put("clients", client);
      return client;
    }),
    update: change(async (id, patch) => {
      const current = await getClient(id);
      const value = validateClient({ ...current, ...patch }, { today: now() });
      const client = { ...current, ...value, updatedAt: stamp() };
      await backend.put("clients", client);
      return client;
    }),
    /**
     * Deletes the client with every reading, file and file byte of theirs, and
     * wipes their name and date from other clients' readings that name them.
     */
    remove: change(async (id) => {
      await getClient(id);
      const t = stamp();
      const ops = [];
      for (const r of await backend.all("readings")) {
        if (r.clientId === id) ops.push({ type: "delete", store: "readings", id: r.id });
        else if (r.input?.other?.clientId === id) {
          ops.push({ type: "put", store: "readings", value: { ...r, input: { ...r.input, other: { ...WIPED_PERSON } }, updatedAt: t } });
        }
      }
      for (const a of await attachmentsOf(id)) ops.push({ type: "delete", store: "attachments", id: a.id }, { type: "deleteBlob", id: a.id });
      ops.push({ type: "delete", store: "clients", id });
      await backend.batch(ops);
    }),
  };

  const readings = {
    listByClient: readingsOf,
    async listRecent(limit = 20) {
      return (await backend.all("readings")).sort(newestFirst("createdAt")).slice(0, limit);
    },
    get: getReading,
    create: change(async (input) => {
      const value = validateReading(input, { today: now() });
      const client = await getClient(value.clientId);
      const t = stamp();
      const reading = { id: newId(), ...value, createdAt: t, updatedAt: t };
      // the client moves to the top of the list; their own edit time is untouched
      await backend.batch([
        { type: "put", store: "readings", value: reading },
        { type: "put", store: "clients", value: { ...client, lastActivityAt: t } },
      ]);
      return reading;
    }),
    update: change(async (id, patch) => {
      const current = await getReading(id);
      const editable = Object.fromEntries(READING_EDITABLE.filter((k) => k in patch).map((k) => [k, patch[k]]));
      const value = validateReading({ ...current, ...editable }, { today: now() });
      const reading = { ...current, ...value, updatedAt: stamp() };
      await backend.put("readings", reading);
      return reading;
    }),
    /** Deletes the reading; files attached to it stay with the client, unlinked. */
    remove: change(async (id) => {
      await getReading(id);
      const ops = (await backend.all("attachments"))
        .filter((a) => a.readingId === id)
        .map((a) => ({ type: "put", store: "attachments", value: { ...a, readingId: null } }));
      ops.push({ type: "delete", store: "readings", id });
      await backend.batch(ops);
    }),
  };

  const attachments = {
    listByClient: attachmentsOf,
    add: change(async ({ clientId, readingId = null, name, type = "", bytes }) => {
      const data = toBytes(bytes);
      const meta = validateAttachment({ clientId, readingId, name, type, size: data.byteLength });
      await getClient(meta.clientId);
      if (meta.readingId && (await getReading(meta.readingId)).clientId !== meta.clientId) {
        throw new ValidationError([{ field: "readingId", code: "otherClient" }]);
      }
      const record = { id: newId(), ...meta, createdAt: stamp() };
      await backend.batch([
        { type: "putBlob", id: record.id, blob: { type: meta.type, bytes: new Uint8Array(data) } },
        { type: "put", store: "attachments", value: record },
      ]);
      return record;
    }),
    async getBlob(id) {
      const blob = await backend.getBlob(id);
      if (!blob) throw new NotFoundError("attachment", id);
      return blob;
    },
    remove: change(async (id) => {
      if (!(await backend.get("attachments", id))) throw new NotFoundError("attachment", id);
      await backend.batch([{ type: "delete", store: "attachments", id }, { type: "deleteBlob", id }]);
    }),
  };

  /** Today's work: follow-ups due by `day`, and birthdays in `day`'s month. */
  async function summary(day = now()) {
    const ymd = toYmd(day);
    const month = day.getMonth() + 1;
    const year = day.getFullYear();
    const activeClients = (await backend.all("clients")).filter((c) => !c.archived);
    const byId = new Map(activeClients.map((c) => [c.id, c]));
    const allReadings = await backend.all("readings");
    const followUps = allReadings
      .filter((r) => r.followUp && r.followUp <= ymd && byId.has(r.clientId))
      .sort((a, b) => (a.followUp < b.followUp ? -1 : a.followUp > b.followUp ? 1 : 0))
      .map((r) => ({ readingId: r.id, clientId: r.clientId, clientName: byId.get(r.clientId).fullName, followUp: r.followUp, type: r.type }));
    const birthdays = activeClients
      .filter((c) => c.birthDate && Number(c.birthDate.slice(5, 7)) === month)
      .map((c) => ({ clientId: c.id, fullName: c.fullName, day: Number(c.birthDate.slice(8, 10)), turning: year - Number(c.birthDate.slice(0, 4)) }))
      .sort((a, b) => a.day - b.day);
    return { clients: activeClients.length, readings: allReadings.length, followUps, birthdays };
  }

  const backup = backupOf(backend, { now });
  return {
    clients,
    readings,
    attachments,
    summary,
    exportAll: backup.exportAll,
    importAll: change(backup.importAll),
    persistent: backend.persistent !== false,
  };
}
