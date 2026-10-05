/**
 * In-memory backend: for tests, and as the fallback when a browser refuses
 * storage (some private windows). Records are structured-cloned on the way in
 * and out, like IndexedDB does, so callers can never share state with it.
 */
export function memoryBackend() {
  const collections = { clients: new Map(), readings: new Map(), attachments: new Map() };
  const blobs = new Map();
  const clone = (x) => (x === undefined ? undefined : structuredClone(x));
  const col = (name) => {
    const c = collections[name];
    if (!c) throw new Error(`unknown collection: ${name}`);
    return c;
  };

  return {
    persistent: false,
    async all(name) {
      return [...col(name).values()].map(clone);
    },
    async get(name, id) {
      return clone(col(name).get(id));
    },
    async put(name, record) {
      col(name).set(record.id, clone(record));
    },
    async delete(name, id) {
      col(name).delete(id);
    },
    async putBlob(id, blob) {
      blobs.set(id, clone({ type: blob.type, bytes: blob.bytes }));
    },
    async getBlob(id) {
      return clone(blobs.get(id));
    },
    async deleteBlob(id) {
      blobs.delete(id);
    },
    async clear() {
      Object.values(collections).forEach((m) => m.clear());
      blobs.clear();
    },
    close() {},
  };
}
