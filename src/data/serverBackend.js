/**
 * The workspace's backend on the server (Supabase), with the same interface
 * as memoryBackend and idbBackend, so the store and its rules do not change.
 *
 * Records are stored whole in the database and reached only through its
 * functions (ws_all, ws_get, ws_snapshot, ws_batch), which check that this is
 * the account's active session; every change of records is one transaction.
 * File bytes live in a private Storage bucket, in the user's own folder:
 * uploaded before the records that point at them, removed again if those
 * records fail, and deleted only after the records are gone.
 */
import { checkOp } from "./memoryBackend.js";

const BUCKET = "ws-files";
const COLLECTIONS = new Set(["clients", "readings", "attachments"]);

/** The account's session is no longer the active one (signed in elsewhere, signed out or suspended). */
export class SessionError extends Error {
  constructor(message = "session not active") {
    super(message);
    this.name = "SessionError";
  }
}

/** A supabase-js error as an Error the app can act on. */
function toError(error) {
  if (error.code === "42501" && /session not active/.test(error.message)) return new SessionError();
  const e = new Error(error.message || "server request failed");
  e.code = error.code;
  return e;
}

const isMissing = (error) => String(error.statusCode) === "404" || /not found/i.test(error.message || "");

/** The database answered with a reason (a SQLSTATE code), so the transaction did not happen. */
const refused = (err) => err instanceof SessionError || /^[0-9A-Z]{5}$/.test(err.code || "");

/**
 * @param {object} client a supabase-js client (rpc and storage), or a stand-in with the same shape
 * @param {string} userId the signed-in user, whose Storage folder holds the files
 */
export function serverBackend(client, userId) {
  const checkStore = (name) => {
    if (!COLLECTIONS.has(name)) throw new Error(`unknown collection: ${name}`);
  };
  const call = async (fn, args) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw toError(error);
    return data;
  };
  const files = () => client.storage.from(BUCKET);
  const path = (id) => `${userId}/${id}`;

  async function putBlob(id, blob) {
    const body = new Blob([blob.bytes], { type: blob.type || "application/octet-stream" });
    const { error } = await files().upload(path(id), body, { contentType: blob.type || "application/octet-stream", upsert: true });
    if (error) throw toError(error);
  }
  async function getBlob(id) {
    const { data, error } = await files().download(path(id));
    if (error) {
      if (isMissing(error)) return undefined;
      throw toError(error);
    }
    // a file with no type is stored as octet-stream (Storage needs one); it comes back with none, as it went in
    return { type: data.type === "application/octet-stream" ? "" : data.type, bytes: new Uint8Array(await data.arrayBuffer()) };
  }
  async function removeBlobs(ids) {
    if (ids.length === 0) return;
    const { error } = await files().remove(ids.map(path));
    if (error) throw toError(error);
  }

  /** All-or-nothing: records in one transaction, files arranged around it. */
  async function batch(ops) {
    for (const op of ops) {
      checkOp(op, checkStore);
      // a value the database could not hold exactly (a function, say) fails here, before anything is sent
      if (op.type === "put") structuredClone(op.value);
    }
    const records = ops.filter((op) => op.type === "put" || op.type === "delete");
    const uploads = ops.filter((op) => op.type === "putBlob");
    const removals = ops.filter((op) => op.type === "deleteBlob").map((op) => op.id);
    const uploaded = [];
    let sent = false;
    try {
      for (const op of uploads) {
        await putBlob(op.id, op.blob);
        uploaded.push(op.id);
      }
      if (records.length) {
        sent = true;
        await call("ws_batch", { p_ops: records });
      }
    } catch (err) {
      // Undo the uploads only when nothing was saved for sure: the records were never sent, or the
      // database refused them. With no answer at all (the network dropped) they may have been saved,
      // and a leftover file is harmless where a missing one is not.
      if (!sent || refused(err)) await removeBlobs(uploaded).catch(() => {});
      throw err;
    }
    // the records are gone; bytes that fail to delete here belong to no record and are never shown
    await removeBlobs(removals).catch(() => {});
  }

  return {
    persistent: true,

    async all(name) {
      checkStore(name);
      return call("ws_all", { p_store: name });
    },
    async get(name, id) {
      checkStore(name);
      return (await call("ws_get", { p_store: name, p_id: id })) ?? undefined;
    },
    put: (name, record) => batch([{ type: "put", store: name, value: record }]),
    delete: (name, id) => batch([{ type: "delete", store: name, id }]),
    putBlob: (id, blob) => batch([{ type: "putBlob", id, blob }]),
    getBlob,
    deleteBlob: (id) => removeBlobs([id]),
    batch,
    /** The records at one moment (one database statement), then the bytes of each file. */
    async snapshot() {
      const snap = await call("ws_snapshot", {});
      const blobs = [];
      for (const a of snap.attachments) {
        const blob = await getBlob(a.id);
        if (blob) blobs.push({ id: a.id, ...blob });
      }
      return { ...snap, blobs };
    },
    close() {},
  };
}
