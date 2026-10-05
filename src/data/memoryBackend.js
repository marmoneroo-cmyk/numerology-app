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
    /** All-or-nothing: every operation is checked, and every value copied, before any is applied. */
    async batch(ops) {
      for (const op of ops) checkOp(op, col);
      // copying is the only step that can fail (a value that cannot be stored), so it happens first
      const ready = ops.map((op) => {
        if (op.type === "put") return { ...op, value: clone(op.value) };
        if (op.type === "putBlob") return { ...op, blob: clone({ type: op.blob.type, bytes: op.blob.bytes }) };
        return op;
      });
      for (const op of ready) {
        if (op.type === "put") col(op.store).set(op.value.id, op.value);
        else if (op.type === "delete") col(op.store).delete(op.id);
        else if (op.type === "putBlob") blobs.set(op.id, op.blob);
        else blobs.delete(op.id);
      }
    },
    /** Everything at one moment: the three collections and every file's bytes. */
    async snapshot() {
      return {
        clients: [...collections.clients.values()].map(clone),
        readings: [...collections.readings.values()].map(clone),
        attachments: [...collections.attachments.values()].map(clone),
        blobs: [...blobs].map(([id, blob]) => ({ id, ...clone(blob) })),
      };
    },
    close() {},
  };
}

/**
 * Throws for an operation a backend could not apply, before anything is
 * written. `checkStore(name)` throws for an unknown collection.
 */
export function checkOp(op, checkStore) {
  if (!op || typeof op !== "object") throw new Error("invalid batch operation");
  switch (op.type) {
    case "put":
      checkStore(op.store);
      if (!op.value || typeof op.value.id !== "string" || !op.value.id) throw new Error("put needs a value with an id");
      return;
    case "delete":
      checkStore(op.store);
      if (typeof op.id !== "string") throw new Error("delete needs an id");
      return;
    case "putBlob":
      if (typeof op.id !== "string" || !op.blob || !op.blob.bytes) throw new Error("putBlob needs an id and bytes");
      return;
    case "deleteBlob":
      if (typeof op.id !== "string") throw new Error("deleteBlob needs an id");
      return;
    default:
      throw new Error(`unknown batch operation: ${op.type}`);
  }
}
