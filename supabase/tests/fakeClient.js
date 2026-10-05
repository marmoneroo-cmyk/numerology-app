/**
 * A stand-in for the parts of supabase-js the app uses - rpc() and Storage -
 * over the PGlite database from the harness. rpc() runs the real database
 * functions as the given user; Storage keeps bytes in memory and allows each
 * user only their own folder, as the bucket's policy does.
 */
import { rpc as callAs } from "./harness.js";

/** One Storage for every client of a database. */
export function createFakeStorage() {
  return new Map();
}

/** supabase-js returns errors instead of throwing: {data, error}. */
const failure = (e) => ({ data: null, error: { message: e.message, code: e.code } });

/**
 * @param {object} db PGlite database from createDatabase()
 * @param {{id: string, sessionId: string}} user the signed-in user
 * @param {Map} storage from createFakeStorage(), shared by the clients of `db`
 */
export function fakeClient(db, user, storage) {
  const ownFolder = (path) => path.startsWith(`${user.id}/`);
  const denied = { data: null, error: { message: "new row violates row-level security policy", statusCode: "403" } };
  const bucket = (name) => ({
    async upload(path, body, { contentType } = {}) {
      if (!ownFolder(path)) return denied;
      const bytes = new Uint8Array(await body.arrayBuffer());
      storage.set(`${name}/${path}`, { type: contentType || body.type || "", bytes });
      return { data: { path }, error: null };
    },
    async download(path) {
      if (!ownFolder(path)) return denied;
      const object = storage.get(`${name}/${path}`);
      if (!object) return { data: null, error: { message: "Object not found", statusCode: "404" } };
      return { data: new Blob([object.bytes], { type: object.type }), error: null };
    },
    async remove(paths) {
      if (!paths.every(ownFolder)) return denied;
      paths.forEach((p) => storage.delete(`${name}/${p}`));
      return { data: paths.map((p) => ({ name: p })), error: null };
    },
  });
  return {
    async rpc(fn, args) {
      try {
        return { data: await callAs(db, user, fn, args), error: null };
      } catch (e) {
        return failure(e);
      }
    },
    storage: { from: bucket },
  };
}
