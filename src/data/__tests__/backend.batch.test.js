import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll } from "vitest";
import { memoryBackend } from "../memoryBackend.js";
import { idbBackend } from "../idbBackend.js";
import { makeServerBackend, prepareServer } from "../../../supabase/tests/serverBackendFixture.js";

beforeAll(() => prepareServer(), 30000);

let n = 0;
describe.each([
  ["memory", async () => memoryBackend()],
  ["IndexedDB", async () => idbBackend(`batch-${++n}`)],
  ["the server", makeServerBackend],
])("backend.batch on %s", (_, make) => {
  it("applies puts, deletes and blobs together", async () => {
    const b = await make();
    await b.put("clients", { id: "gone", fullName: "x" });
    await b.putBlob("f-old", { type: "text/plain", bytes: new Uint8Array([9]) });
    await b.batch([
      { type: "put", store: "clients", value: { id: "c1", fullName: "שני" } },
      { type: "put", store: "readings", value: { id: "r1", clientId: "c1" } },
      { type: "putBlob", id: "f1", blob: { type: "text/plain", bytes: new Uint8Array([1, 2]) } },
      { type: "delete", store: "clients", id: "gone" },
      { type: "deleteBlob", id: "f-old" },
    ]);
    expect((await b.all("clients")).map((c) => c.id)).toEqual(["c1"]);
    expect(await b.get("readings", "r1")).toEqual({ id: "r1", clientId: "c1" });
    expect([...(await b.getBlob("f1")).bytes]).toEqual([1, 2]);
    expect(await b.getBlob("f-old")).toBeUndefined();
  });

  it("applies nothing when any operation is invalid", async () => {
    const b = await make();
    await b.put("clients", { id: "keep", fullName: "נשאר" });
    await expect(b.batch([
      { type: "delete", store: "clients", id: "keep" },
      { type: "put", store: "clients", value: { id: "c2" } },
      { type: "put", store: "nonsense", value: { id: "x" } },
    ])).rejects.toThrow();
    expect((await b.all("clients")).map((c) => c.id)).toEqual(["keep"]);
  });

  it("applies nothing when a value fails half-way through (cannot be stored)", async () => {
    const b = await make();
    await b.put("clients", { id: "keep", fullName: "נשאר" });
    await expect(b.batch([
      { type: "delete", store: "clients", id: "keep" },
      { type: "put", store: "clients", value: { id: "c2", fullName: "חדש" } },
      { type: "put", store: "clients", value: { id: "c3", notStorable: () => {} } },
    ])).rejects.toThrow();
    expect(await b.all("clients")).toEqual([{ id: "keep", fullName: "נשאר" }]);
  });

  it("does nothing for an empty batch", async () => {
    const b = await make();
    await b.batch([]);
    expect(await b.all("clients")).toEqual([]);
  });

  it("reads everything, bytes included, as one consistent snapshot", async () => {
    const b = await make();
    await b.batch([
      { type: "put", store: "clients", value: { id: "c1", fullName: "שני" } },
      { type: "put", store: "readings", value: { id: "r1", clientId: "c1" } },
      { type: "put", store: "attachments", value: { id: "f1", clientId: "c1" } },
      { type: "putBlob", id: "f1", blob: { type: "text/plain", bytes: new Uint8Array([7, 8]) } },
    ]);
    const snap = await b.snapshot();
    expect(snap.clients).toEqual([{ id: "c1", fullName: "שני" }]);
    expect(snap.readings).toEqual([{ id: "r1", clientId: "c1" }]);
    expect(snap.attachments).toEqual([{ id: "f1", clientId: "c1" }]);
    expect(snap.blobs.map((x) => [x.id, x.type, [...x.bytes]])).toEqual([["f1", "text/plain", [7, 8]]]);
    snap.clients[0].fullName = "changed"; // a copy, like every other read
    expect((await b.get("clients", "c1")).fullName).toBe("שני");
  });
});
