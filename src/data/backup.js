/**
 * Backup and restore of the whole workspace, as one JSON-safe object with the
 * file bytes inlined as base64. A restore checks the entire backup before it
 * writes anything, then merges it in one all-or-nothing batch:
 * - a client is replaced only by a newer copy of itself;
 * - readings and files are only ever added, never replaced or moved;
 * - each record may appear once;
 * - timestamps are normalised. One from the future is brought back to the
 *   time of the restore, and proves nothing about being newer.
 */
import { validateClient, validateReading, validateAttachment, ValidationError } from "./validation.js";
import { bytesToBase64, base64ToBytes } from "./bytes.js";

export const BACKUP_FORMAT = "numerology-workspace-backup";
const BACKUP_VERSION = 1;
/** How far ahead of this device's clock a timestamp may be (clock drift) before it counts as from the future. */
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;
const MAX_ID_LENGTH = 100;

const later = (a, b) => (a && a > b ? a : b);

/**
 * @param {object} backend memoryBackend() or idbBackend()
 * @param {{now: () => Date}} opts the store's clock
 */
export function backupOf(backend, { now }) {
  /** Everything, read at one moment. A file whose bytes are gone is left out and counted in missingFiles. */
  async function exportAll() {
    const snap = await backend.snapshot();
    const bytesOf = new Map(snap.blobs.map((b) => [b.id, b.bytes]));
    const attachments = snap.attachments.filter((a) => bytesOf.has(a.id)).map((a) => ({ ...a, data: bytesToBase64(bytesOf.get(a.id)) }));
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now().toISOString(),
      clients: snap.clients,
      readings: snap.readings,
      attachments,
      missingFiles: snap.attachments.length - attachments.length,
    };
  }

  /** The write that merges `client` into this store's copy, or null when there is nothing to write. */
  async function mergeClient(client, fromFuture) {
    const existing = await backend.get("clients", client.id);
    if (!existing) return { value: client, restored: true };
    const lastActivityAt = later(existing.lastActivityAt, client.lastActivityAt);
    if (!fromFuture && client.updatedAt > existing.updatedAt) return { value: { ...client, lastActivityAt }, restored: true };
    // not newer, but readings saved elsewhere arrive with it: it moves up the list, unchanged
    if (lastActivityAt !== existing.lastActivityAt) return { value: { ...existing, lastActivityAt }, restored: false };
    return null;
  }

  /** @returns {Promise<{clients: number, readings: number, attachments: number}>} records restored */
  async function importAll(backup, { mode = "merge" } = {}) {
    if (mode !== "merge") throw new ValidationError([{ field: "mode", code: "invalid" }]);
    const parsed = await parseBackup(backup, backend, now());
    const ops = [];
    const counts = { clients: 0, readings: 0, attachments: 0 };
    for (const { client, fromFuture } of parsed.clients) {
      const write = await mergeClient(client, fromFuture);
      if (!write) continue;
      ops.push({ type: "put", store: "clients", value: write.value });
      if (write.restored) counts.clients++;
    }
    for (const reading of parsed.readings) {
      if (await backend.get("readings", reading.id)) continue;
      ops.push({ type: "put", store: "readings", value: reading });
      counts.readings++;
    }
    for (const { record, bytes } of parsed.files) {
      if (await backend.get("attachments", record.id)) continue;
      ops.push({ type: "putBlob", id: record.id, blob: { type: record.type, bytes } }, { type: "put", store: "attachments", value: record });
      counts.attachments++;
    }
    await backend.batch(ops);
    return counts;
  }

  return { exportAll, importAll };
}

/** Checks the whole backup against this store; returns the normalised records, or throws every problem found. */
async function parseBackup(backup, backend, today) {
  const isList = Array.isArray;
  if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION || !isList(backup.clients) || !isList(backup.readings) || !isList(backup.attachments)) {
    throw new ValidationError([{ field: "backup", code: "format" }]);
  }
  const ctx = {
    ...problems(),
    today,
    nowMs: today.getTime(),
    clientIds: new Set((await backend.all("clients")).map((c) => c.id)),
    readingOwner: new Map((await backend.all("readings")).map((r) => [r.id, r.clientId])),
  };
  const clients = parseClients(backup.clients, ctx);
  const readings = parseReadings(backup.readings, ctx);
  const files = parseFiles(backup.attachments, ctx);
  if (ctx.errors.length) throw new ValidationError(ctx.errors);
  return { clients, readings, files };
}

/** Collects every problem, so one restore attempt reports them all. */
function problems() {
  const errors = [];
  const fail = (field, code) => {
    errors.push({ field, code });
    return null;
  };
  /** Runs a validator; its ValidationError becomes problems under `prefix`. */
  const check = (prefix, validate) => {
    try {
      return validate();
    } catch (e) {
      if (!(e instanceof ValidationError)) throw e;
      e.errors.forEach((x) => fail(`${prefix}.${x.field}`, x.code));
      return null;
    }
  };
  return { errors, fail, check };
}

/**
 * A timestamp as canonical ISO, so string order is time order; null when it
 * is not a date or lies before 1970. One from the future comes back as the
 * time of the restore, flagged.
 */
function normaliseStamp(s, nowMs) {
  if (typeof s !== "string") return null;
  const ms = Date.parse(s);
  if (Number.isNaN(ms) || ms < 0) return null;
  const future = ms > nowMs + FUTURE_TOLERANCE_MS;
  return { iso: new Date(future ? nowMs : ms).toISOString(), future };
}

/** A record's id and timestamps, or null after recording why not. Each id may appear once per collection. */
function identity(r, prefix, ctx, seen, hasUpdatedAt = true) {
  const created = r && normaliseStamp(r.createdAt, ctx.nowMs);
  const updated = hasUpdatedAt ? r && normaliseStamp(r.updatedAt, ctx.nowMs) : created;
  if (!r || typeof r.id !== "string" || !r.id || r.id.length > MAX_ID_LENGTH || !created || !updated) return ctx.fail(prefix, "invalid");
  if (seen.has(r.id)) return ctx.fail(`${prefix}.id`, "duplicate");
  seen.add(r.id);
  return { id: r.id, createdAt: created.iso, updatedAt: updated.iso, fromFuture: created.future || updated.future };
}

function parseClients(list, ctx) {
  const seen = new Set();
  const out = [];
  list.forEach((r, i) => {
    const prefix = `clients[${i}]`;
    const s = identity(r, prefix, ctx, seen);
    const value = s && ctx.check(prefix, () => validateClient(r, { today: ctx.today }));
    if (!value) return;
    const activity = normaliseStamp(r.lastActivityAt, ctx.nowMs);
    const client = { id: s.id, ...value, createdAt: s.createdAt, updatedAt: s.updatedAt, lastActivityAt: activity ? activity.iso : s.updatedAt };
    out.push({ client, fromFuture: s.fromFuture });
    ctx.clientIds.add(s.id);
  });
  return out;
}

function parseReadings(list, ctx) {
  const seen = new Set();
  const out = [];
  list.forEach((r, i) => {
    const prefix = `readings[${i}]`;
    const s = identity(r, prefix, ctx, seen);
    const value = s && ctx.check(prefix, () => validateReading(r, { today: ctx.today }));
    if (!value) return;
    if (!ctx.clientIds.has(value.clientId)) return ctx.fail(`${prefix}.clientId`, "unknown");
    out.push({ id: s.id, ...value, createdAt: s.createdAt, updatedAt: s.updatedAt });
    // a reading already here keeps its owner: restoring never moves it
    if (!ctx.readingOwner.has(s.id)) ctx.readingOwner.set(s.id, value.clientId);
  });
  return out;
}

function parseFiles(list, ctx) {
  const seen = new Set();
  const out = [];
  list.forEach((r, i) => {
    const prefix = `attachments[${i}]`;
    const s = identity(r, prefix, ctx, seen, false);
    if (!s) return;
    let bytes;
    try {
      bytes = base64ToBytes(r.data);
    } catch {
      return ctx.fail(`${prefix}.data`, "invalid");
    }
    const meta = ctx.check(prefix, () => validateAttachment({ ...r, size: bytes.byteLength }));
    if (!meta) return;
    if (!ctx.clientIds.has(meta.clientId)) return ctx.fail(`${prefix}.clientId`, "unknown");
    if (meta.readingId && ctx.readingOwner.get(meta.readingId) !== meta.clientId) return ctx.fail(`${prefix}.readingId`, "unknown");
    out.push({ record: { id: s.id, ...meta, createdAt: s.createdAt }, bytes });
  });
  return out;
}
