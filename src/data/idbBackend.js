/**
 * IndexedDB backend: the workspace's storage on this device. Four object
 * stores keyed by `id`: clients, readings, attachments (metadata) and blobs
 * (attachment bytes as Uint8Array, which IndexedDB clones natively).
 */
import { checkOp } from "./memoryBackend.js";

const STORES = ["clients", "readings", "attachments", "blobs"];
const DATA_STORES = new Set(["clients", "readings", "attachments"]);
const VERSION = 1;

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** The real reason a transaction failed (tx.error is still null inside onerror). */
const failure = (tx, req) => (req && req.error) || tx.error || new Error("IndexedDB transaction failed");

/**
 * @param {string} [name] database name
 * @param {IDBFactory} [idb] injectable for tests
 */
export async function idbBackend(name = "numerology-workspace", idb = globalThis.indexedDB) {
  if (!idb) throw new Error("IndexedDB is not available");
  const opening = idb.open(name, VERSION);
  opening.onupgradeneeded = () => {
    const db = opening.result;
    for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
  };
  const blocked = new Promise((_, reject) => {
    opening.onblocked = () => reject(new Error("IndexedDB upgrade blocked: the workspace is open in another tab"));
  });
  const db = await Promise.race([request(opening), blocked]);
  // A newer version of the app, open in another tab, needs to upgrade the database: let it.
  // This tab's connection closes, and its next read or write asks for a reload.
  let closed = false;
  db.onversionchange = () => {
    closed = true;
    db.close();
  };
  /** A transaction, or the reason there can be none. */
  const begin = (stores, mode) => {
    if (closed) throw new Error("The workspace was updated in another tab. Reload this page.");
    return db.transaction(stores, mode);
  };

  /** One request in its own transaction; resolves when the transaction commits. */
  function run(store, mode, op) {
    return new Promise((resolve, reject) => {
      const tx = begin(store, mode);
      let result;
      const req = op(tx.objectStore(store));
      req.onsuccess = () => {
        result = req.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(failure(tx, req));
      tx.onabort = () => reject(failure(tx, req));
    });
  }

  const checkStore = (name) => {
    if (!DATA_STORES.has(name)) throw new Error(`unknown collection: ${name}`);
  };

  return {
    persistent: true,
    all: (name) => run(name, "readonly", (s) => s.getAll()),
    get: (name, id) => run(name, "readonly", (s) => s.get(id)),
    async put(name, record) {
      await run(name, "readwrite", (s) => s.put(record));
    },
    async delete(name, id) {
      await run(name, "readwrite", (s) => s.delete(id));
    },
    async putBlob(id, blob) {
      await run("blobs", "readwrite", (s) => s.put({ id, type: blob.type, bytes: blob.bytes }));
    },
    async getBlob(id) {
      const r = await run("blobs", "readonly", (s) => s.get(id));
      return r ? { type: r.type, bytes: r.bytes } : undefined;
    },
    async deleteBlob(id) {
      await run("blobs", "readwrite", (s) => s.delete(id));
    },
    /** All-or-nothing: one transaction over every store involved; any failure rolls all of it back. */
    async batch(ops) {
      for (const op of ops) checkOp(op, checkStore);
      if (ops.length === 0) return;
      const stores = [...new Set(ops.map((op) => (op.type === "putBlob" || op.type === "deleteBlob" ? "blobs" : op.store)))];
      await new Promise((resolve, reject) => {
        const tx = begin(stores, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(failure(tx));
        tx.onabort = () => reject(failure(tx));
        try {
          for (const op of ops) {
            if (op.type === "put") tx.objectStore(op.store).put(op.value);
            else if (op.type === "delete") tx.objectStore(op.store).delete(op.id);
            else if (op.type === "putBlob") tx.objectStore("blobs").put({ id: op.id, type: op.blob.type, bytes: op.blob.bytes });
            else tx.objectStore("blobs").delete(op.id);
          }
        } catch (err) {
          // a value that cannot be stored throws here, after earlier requests were queued: undo them all
          reject(err);
          tx.abort();
        }
      });
    },
    /** Everything at one moment (one read transaction): the three collections and every file's bytes. */
    snapshot() {
      return new Promise((resolve, reject) => {
        const tx = begin(STORES, "readonly");
        const out = {};
        STORES.forEach((s) => {
          const req = tx.objectStore(s).getAll();
          req.onsuccess = () => {
            out[s] = req.result;
          };
        });
        tx.oncomplete = () => resolve({
          clients: out.clients,
          readings: out.readings,
          attachments: out.attachments,
          blobs: out.blobs.map((b) => ({ id: b.id, type: b.type, bytes: b.bytes })),
        });
        tx.onerror = () => reject(failure(tx));
        tx.onabort = () => reject(failure(tx));
      });
    },
    close: () => db.close(),
  };
}
