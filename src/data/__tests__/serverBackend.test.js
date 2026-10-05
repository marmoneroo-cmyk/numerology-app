/*
 * What only the server backend does, beyond the shared contract: keeping file
 * bytes in step with the records when the database refuses a change, and
 * telling the app when its session is no longer the active one.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createDatabase, createUser, newSession, endSession, rpc } from "../../../supabase/tests/harness.js";
import { fakeClient, createFakeStorage } from "../../../supabase/tests/fakeClient.js";
import { serverBackend, SessionError } from "../serverBackend.js";

let db;
let storage;
beforeAll(async () => {
  db = await createDatabase();
  storage = createFakeStorage();
}, 30000);

let devices = 0;
async function signedIn() {
  const id = await createUser(db);
  const user = { id, sessionId: await newSession(db, id) };
  await rpc(db, user, "claim_session", { p_device_key: `server-test-device-${String(++devices).padStart(6, "0")}`, p_label: "tests" });
  return { user, backend: serverBackend(fakeClient(db, user, storage), id) };
}
const bytes = (...xs) => new Uint8Array(xs);
const stored = (userId, id) => storage.has(`ws-files/${userId}/${id}`);

describe("serverBackend", () => {
  it("removes the bytes it uploaded when the database refuses the records", async () => {
    const { user, backend } = await signedIn();
    const tooBig = { id: "c1", notes: "x".repeat(70000) }; // over the 64 KB a client record may take
    await expect(backend.batch([
      { type: "putBlob", id: "f1", blob: { type: "text/plain", bytes: bytes(1, 2) } },
      { type: "put", store: "attachments", value: { id: "f1", clientId: "c1" } },
      { type: "put", store: "clients", value: tooBig },
    ])).rejects.toThrow(/check constraint/);
    expect(stored(user.id, "f1")).toBe(false);
    expect(await backend.all("attachments")).toEqual([]);
  });

  it("deletes a file's bytes only once its record is gone", async () => {
    const { user, backend } = await signedIn();
    await backend.batch([
      { type: "putBlob", id: "f1", blob: { type: "application/pdf", bytes: bytes(7) } },
      { type: "put", store: "attachments", value: { id: "f1" } },
    ]);
    expect(stored(user.id, "f1")).toBe(true);
    await expect(backend.batch([
      { type: "delete", store: "attachments", id: "f1" },
      { type: "deleteBlob", id: "f1" },
      { type: "put", store: "clients", value: { id: "bad", notes: "x".repeat(70000) } },
    ])).rejects.toThrow();
    expect(stored(user.id, "f1")).toBe(true);
    await backend.batch([{ type: "delete", store: "attachments", id: "f1" }, { type: "deleteBlob", id: "f1" }]);
    expect(stored(user.id, "f1")).toBe(false);
  });

  it("returns nothing for a missing file, and the file's type as it was stored", async () => {
    const { backend } = await signedIn();
    expect(await backend.getBlob("nope")).toBeUndefined();
    await backend.putBlob("untyped", { type: "", bytes: bytes(1) });
    expect((await backend.getBlob("untyped")).type).toBe("");
  });

  it("says when its session is no longer the active one", async () => {
    const { user, backend } = await signedIn();
    const elsewhere = { id: user.id, sessionId: await newSession(db, user.id) };
    await rpc(db, elsewhere, "claim_session", { p_device_key: `server-test-device-${String(++devices).padStart(6, "0")}`, p_label: "phone" });
    await expect(backend.all("clients")).rejects.toBeInstanceOf(SessionError);
    await expect(backend.batch([{ type: "put", store: "clients", value: { id: "c1" } }])).rejects.toBeInstanceOf(SessionError);
  });

  it("says so too after signing out", async () => {
    const { user, backend } = await signedIn();
    await endSession(db, user.sessionId);
    await expect(backend.snapshot()).rejects.toBeInstanceOf(SessionError);
  });

  it("refuses unknown collections and values the database could not hold, before sending anything", async () => {
    const { backend } = await signedIn();
    await expect(backend.all("nonsense")).rejects.toThrow(/unknown collection/);
    await expect(backend.batch([{ type: "put", store: "clients", value: { id: "c1", f: () => {} } }])).rejects.toThrow();
    expect(await backend.all("clients")).toEqual([]);
  });
});
