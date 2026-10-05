/**
 * The workspace store: client files, saved readings, attachments, summary and
 * backup, over any backend (IndexedDB on this device today; the server later
 * implements the same API and passes the same contract tests).
 *
 * All the rules live here, none in the backends: validation, ids, timestamps,
 * search, cascading deletes, and what may be edited. A saved reading's
 * snapshot (input, result, engineVersion, computedFor) can never be edited.
 */
import { validateClient, validateReading, validateAttachment, ValidationError } from "./validation.js";
import { toBytes, bytesToBase64, base64ToBytes } from "./bytes.js";

export class NotFoundError extends Error {
  constructor(kind, id) {
    super(`${kind} not found: ${id}`);
    this.name = "NotFoundError";
    this.kind = kind;
    this.id = id;
  }
}

export const BACKUP_FORMAT = "numerology-workspace-backup";
const BACKUP_VERSION = 1;
/** The only fields of a saved reading that may change after it is saved. */
const READING_EDITABLE = ["title", "notes", "followUp"];

const pad2 = (n) => String(n).padStart(2, "0");
/** Local calendar date as YYYY-MM-DD. */
export const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const newestFirst = (key) => (a, b) => (a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0);
const lower = (s) => String(s || "").toLowerCase();
const digitsOf = (s) => String(s || "").replace(/\D/g, "");
const isTimestamp = (s) => typeof s === "string" && !Number.isNaN(Date.parse(s));

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
 * @param {{now?: () => Date, newId?: () => string}} [opts] injectable clock and ids
 */
export function createStore(backend, { now = () => new Date(), newId = () => crypto.randomUUID() } = {}) {
  const stamp = () => now().toISOString();

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
      return (await backend.all("clients"))
        .filter((c) => (includeArchived || !c.archived) && matches(c, search))
        .sort(newestFirst("updatedAt"));
    },
    get: getClient,
    async create(input) {
      const value = validateClient(input, { today: now() });
      const t = stamp();
      const client = { id: newId(), ...value, createdAt: t, updatedAt: t };
      await backend.put("clients", client);
      return client;
    },
    async update(id, patch) {
      const current = await getClient(id);
      const value = validateClient({ ...current, ...patch }, { today: now() });
      const client = { ...current, ...value, updatedAt: stamp() };
      await backend.put("clients", client);
      return client;
    },
    /** Deletes the client with every reading, attachment and file byte of theirs. */
    async remove(id) {
      await getClient(id);
      for (const r of await readingsOf(id)) await backend.delete("readings", r.id);
      for (const a of await attachmentsOf(id)) {
        await backend.deleteBlob(a.id);
        await backend.delete("attachments", a.id);
      }
      await backend.delete("clients", id);
    },
  };

  const readings = {
    listByClient: readingsOf,
    async listRecent(limit = 20) {
      return (await backend.all("readings")).sort(newestFirst("createdAt")).slice(0, limit);
    },
    get: getReading,
    async create(input) {
      const value = validateReading(input, { today: now() });
      const client = await getClient(value.clientId);
      const t = stamp();
      const reading = { id: newId(), ...value, createdAt: t, updatedAt: t };
      await backend.put("readings", reading);
      await backend.put("clients", { ...client, updatedAt: t }); // the client moves to the top of the list
      return reading;
    },
    async update(id, patch) {
      const current = await getReading(id);
      const editable = Object.fromEntries(READING_EDITABLE.filter((k) => k in patch).map((k) => [k, patch[k]]));
      const value = validateReading({ ...current, ...editable }, { today: now() });
      const reading = { ...current, ...value, updatedAt: stamp() };
      await backend.put("readings", reading);
      return reading;
    },
    /** Deletes the reading; files attached to it stay with the client, unlinked. */
    async remove(id) {
      await getReading(id);
      for (const a of await backend.all("attachments")) {
        if (a.readingId === id) await backend.put("attachments", { ...a, readingId: null });
      }
      await backend.delete("readings", id);
    },
  };

  const attachments = {
    listByClient: attachmentsOf,
    async add({ clientId, readingId = null, name, type = "", bytes }) {
      const data = toBytes(bytes);
      const meta = validateAttachment({ clientId, readingId, name, type, size: data.byteLength });
      await getClient(meta.clientId);
      if (meta.readingId) await getReading(meta.readingId);
      const record = { id: newId(), ...meta, createdAt: stamp() };
      await backend.putBlob(record.id, { type: meta.type, bytes: new Uint8Array(data) });
      await backend.put("attachments", record);
      return record;
    },
    async getBlob(id) {
      const blob = await backend.getBlob(id);
      if (!blob) throw new NotFoundError("attachment", id);
      return blob;
    },
    async remove(id) {
      if (!(await backend.get("attachments", id))) throw new NotFoundError("attachment", id);
      await backend.deleteBlob(id);
      await backend.delete("attachments", id);
    },
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

  /** Everything, as one JSON-safe object; attachment bytes are inlined as base64. */
  async function exportAll() {
    const files = [];
    for (const a of await backend.all("attachments")) {
      const blob = await backend.getBlob(a.id);
      files.push({ ...a, data: blob ? bytesToBase64(blob.bytes) : "" });
    }
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: stamp(),
      clients: await backend.all("clients"),
      readings: await backend.all("readings"),
      attachments: files,
    };
  }

  /** Validates the whole backup first; nothing is written unless all of it is valid. */
  async function parseBackup(backup, mode) {
    const errors = [];
    const fail = (field, code) => errors.push({ field, code });
    const check = (prefix, fn) => {
      try {
        return fn();
      } catch (e) {
        if (!(e instanceof ValidationError)) throw e;
        e.errors.forEach((x) => fail(`${prefix}.${x.field}`, x.code));
        return null;
      }
    };
    const list = (x) => (Array.isArray(x) ? x : null);
    if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
      throw new ValidationError([{ field: "backup", code: "format" }]);
    }
    const [inClients, inReadings, inFiles] = [list(backup.clients), list(backup.readings), list(backup.attachments)];
    if (!inClients || !inReadings || !inFiles) throw new ValidationError([{ field: "backup", code: "format" }]);
    const stamped = (r, prefix, withUpdated = true) => {
      const ok = r && typeof r.id === "string" && r.id && isTimestamp(r.createdAt) && (!withUpdated || isTimestamp(r.updatedAt));
      if (!ok) fail(prefix, "invalid");
      return ok;
    };

    const clientIds = new Set(mode === "merge" ? (await backend.all("clients")).map((c) => c.id) : []);
    const readingIds = new Set(mode === "merge" ? (await backend.all("readings")).map((r) => r.id) : []);
    const clientsOut = [];
    inClients.forEach((r, i) => {
      if (!stamped(r, `clients[${i}]`)) return;
      const value = check(`clients[${i}]`, () => validateClient(r, { today: now() }));
      if (value) {
        clientsOut.push({ id: r.id, ...value, createdAt: r.createdAt, updatedAt: r.updatedAt });
        clientIds.add(r.id);
      }
    });
    const readingsOut = [];
    inReadings.forEach((r, i) => {
      if (!stamped(r, `readings[${i}]`)) return;
      const value = check(`readings[${i}]`, () => validateReading(r, { today: now() }));
      if (!value) return;
      if (!clientIds.has(value.clientId)) return fail(`readings[${i}].clientId`, "unknown");
      readingsOut.push({ id: r.id, ...value, createdAt: r.createdAt, updatedAt: r.updatedAt });
      readingIds.add(r.id);
    });
    const filesOut = [];
    inFiles.forEach((r, i) => {
      if (!stamped(r, `attachments[${i}]`, false)) return;
      let bytes;
      try {
        bytes = base64ToBytes(r.data);
      } catch {
        return fail(`attachments[${i}].data`, "invalid");
      }
      const meta = check(`attachments[${i}]`, () => validateAttachment({ ...r, size: bytes.byteLength }));
      if (!meta) return;
      if (!clientIds.has(meta.clientId)) return fail(`attachments[${i}].clientId`, "unknown");
      if (meta.readingId && !readingIds.has(meta.readingId)) return fail(`attachments[${i}].readingId`, "unknown");
      filesOut.push({ record: { id: r.id, ...meta, createdAt: r.createdAt }, bytes });
    });
    if (errors.length) throw new ValidationError(errors);
    return { clientsOut, readingsOut, filesOut };
  }

  /**
   * @param {object} backup what exportAll produced (after a JSON round trip)
   * @param {{mode?: "merge"|"replace"}} [opts] merge keeps whichever copy was updated last
   * @returns {Promise<{clients: number, readings: number, attachments: number}>} records written
   */
  async function importAll(backup, { mode = "merge" } = {}) {
    if (mode !== "merge" && mode !== "replace") throw new ValidationError([{ field: "mode", code: "invalid" }]);
    const { clientsOut, readingsOut, filesOut } = await parseBackup(backup, mode);
    if (mode === "replace") await backend.clear();
    const counts = { clients: 0, readings: 0, attachments: 0 };
    const newer = async (name, rec) => {
      const existing = mode === "merge" ? await backend.get(name, rec.id) : undefined;
      return !existing || existing.updatedAt < rec.updatedAt;
    };
    for (const c of clientsOut) if (await newer("clients", c)) { await backend.put("clients", c); counts.clients++; }
    for (const r of readingsOut) if (await newer("readings", r)) { await backend.put("readings", r); counts.readings++; }
    for (const { record, bytes } of filesOut) {
      if (mode === "merge" && (await backend.get("attachments", record.id))) continue;
      await backend.putBlob(record.id, { type: record.type, bytes });
      await backend.put("attachments", record);
      counts.attachments++;
    }
    return counts;
  }

  return { clients, readings, attachments, summary, exportAll, importAll, persistent: backend.persistent !== false };
}
