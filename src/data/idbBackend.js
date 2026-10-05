/**
 * IndexedDB backend: the workspace's storage on this device. Four object
 * stores keyed by `id`: clients, readings, attachments (metadata) and blobs
 * (attachment bytes as Uint8Array, which IndexedDB clones natively).
 */
const STORES = ["clients", "readings", "attachments", "blobs"];
const VERSION = 1;

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

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
  const db = await request(opening);

  /** One request in its own transaction; resolves when the transaction commits. */
  function run(store, mode, op) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      let result;
      const req = op(tx.objectStore(store));
      req.onsuccess = () => {
        result = req.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("transaction aborted"));
    });
  }

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
    clear() {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES, "readwrite");
        STORES.forEach((s) => tx.objectStore(s).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    close: () => db.close(),
  };
}
