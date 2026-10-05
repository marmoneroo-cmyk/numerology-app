/*
 * The store contract. Every backend runs this same suite, so the workspace
 * behaves identically on this device (IndexedDB), in memory, and - in step 3 -
 * on the server.
 */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createStore, NotFoundError } from "../store.js";
import { memoryBackend } from "../memoryBackend.js";
import { idbBackend } from "../idbBackend.js";
import { ValidationError, LIMITS } from "../validation.js";

let dbCounter = 0;
const BACKENDS = [
  ["memory", async () => memoryBackend()],
  ["IndexedDB", async () => idbBackend(`contract-${++dbCounter}`)],
];

const bytes = (...xs) => new Uint8Array(xs);
const mapReading = (clientId, over = {}) => ({
  clientId, type: "map", input: { name: "שני כהן", birthDate: "1990-08-15", add: false },
  result: { lp: 33, nv: 4, pk: [5, 7, 3, 9] }, engineVersion: "1.0.0", computedFor: "2026-10-05T09:00:00.000Z", ...over,
});

describe.each(BACKENDS)("store on %s", (_, makeBackend) => {
  let store, t;
  const tick = (ms = 60000) => { t += ms; };
  const makeStore = async () => {
    let n = 0;
    return createStore(await makeBackend(), { now: () => new Date(t), newId: () => `id-${++n}` });
  };

  beforeEach(async () => {
    t = Date.UTC(2026, 9, 5, 9, 0, 0);
    store = await makeStore();
  });

  describe("clients", () => {
    it("creates a client with an id, timestamps and normalised fields", async () => {
      const c = await store.clients.create({ fullName: " שני כהן ", birthDate: "1990-08-15", tags: "vip, חלה", hacker: true });
      expect(c).toEqual({
        id: "id-1", fullName: "שני כהן", birthName: "", birthDate: "1990-08-15", phone: "", email: "",
        tags: ["vip", "חלה"], notes: "", consent: false, archived: false,
        createdAt: "2026-10-05T09:00:00.000Z", updatedAt: "2026-10-05T09:00:00.000Z",
      });
      expect(await store.clients.get("id-1")).toEqual(c);
    });

    it("lists the most recently updated first, hiding archived ones unless asked", async () => {
      const a = await store.clients.create({ fullName: "אורית" });
      tick();
      const b = await store.clients.create({ fullName: "בתיה" });
      tick();
      await store.clients.update(a.id, { archived: true });
      expect((await store.clients.list()).map((c) => c.fullName)).toEqual(["בתיה"]);
      expect((await store.clients.list({ includeArchived: true })).map((c) => c.fullName)).toEqual(["אורית", "בתיה"]);
      expect(b.archived).toBe(false);
    });

    it("searches name, birth name, phone digits, email and tags", async () => {
      await store.clients.create({ fullName: "רחל לוי", birthName: "רחל כהן", phone: "052-123-4567", email: "Rachel@Mail.com", tags: ["vip"] });
      await store.clients.create({ fullName: "משה", tags: ["סדנה"] });
      const names = async (search) => (await store.clients.list({ search })).map((c) => c.fullName);
      expect(await names("לוי")).toEqual(["רחל לוי"]);
      expect(await names("כהן")).toEqual(["רחל לוי"]);
      expect(await names("0521234567")).toEqual(["רחל לוי"]);
      expect(await names("rachel@mail")).toEqual(["רחל לוי"]);
      expect(await names("סדנה")).toEqual(["משה"]);
      expect(await names("")).toHaveLength(2);
    });

    it("updates fields and updatedAt but never id or createdAt", async () => {
      const c = await store.clients.create({ fullName: "דנה" });
      tick();
      const u = await store.clients.update(c.id, { fullName: "דנה לוי", id: "hijack", createdAt: "1999-01-01T00:00:00.000Z" });
      expect(u).toMatchObject({ id: c.id, fullName: "דנה לוי", createdAt: c.createdAt, updatedAt: "2026-10-05T09:01:00.000Z" });
    });

    it("rejects invalid data without changing anything", async () => {
      const c = await store.clients.create({ fullName: "דנה" });
      await expect(store.clients.update(c.id, { fullName: "", email: "x" })).rejects.toBeInstanceOf(ValidationError);
      await expect(store.clients.create({ fullName: "" })).rejects.toBeInstanceOf(ValidationError);
      expect(await store.clients.get(c.id)).toEqual(c);
      expect(await store.clients.list()).toHaveLength(1);
    });

    it("throws NotFoundError for an unknown client", async () => {
      await expect(store.clients.get("nope")).rejects.toBeInstanceOf(NotFoundError);
      await expect(store.clients.update("nope", { fullName: "x" })).rejects.toBeInstanceOf(NotFoundError);
    });

    it("hands out copies: mutating a result does not touch the store", async () => {
      const c = await store.clients.create({ fullName: "דנה", tags: ["a"] });
      c.tags.push("b");
      c.fullName = "changed";
      const again = await store.clients.get(c.id);
      expect(again.fullName).toBe("דנה");
      expect(again.tags).toEqual(["a"]);
    });
  });

  describe("readings", () => {
    let client;
    beforeEach(async () => {
      client = await store.clients.create({ fullName: "שני כהן", birthDate: "1990-08-15" });
    });

    it("stores the snapshot exactly and lists newest first", async () => {
      tick();
      const r1 = await store.readings.create(mapReading(client.id));
      tick();
      const r2 = await store.readings.create(mapReading(client.id, { type: "yearCycle", result: { proj: [{ year: 2026, py: 6 }] } }));
      expect(r1).toMatchObject({ clientId: client.id, type: "map", result: { lp: 33, nv: 4, pk: [5, 7, 3, 9] }, engineVersion: "1.0.0", notes: "", followUp: null });
      expect((await store.readings.listByClient(client.id)).map((r) => r.id)).toEqual([r2.id, r1.id]);
      expect(await store.readings.get(r1.id)).toEqual(r1);
    });

    it("needs an existing client", async () => {
      await expect(store.readings.create(mapReading("ghost"))).rejects.toBeInstanceOf(NotFoundError);
    });

    it("brings the client to the top of the list when a reading is saved", async () => {
      tick();
      const other = await store.clients.create({ fullName: "אחרת" });
      tick();
      await store.readings.create(mapReading(client.id));
      expect((await store.clients.list()).map((c) => c.id)).toEqual([client.id, other.id]);
    });

    it("lets you edit the title, notes and follow-up but never the snapshot", async () => {
      const r = await store.readings.create(mapReading(client.id));
      tick();
      const u = await store.readings.update(r.id, { notes: "דיברנו על השנה האישית", followUp: "2026-11-01", title: "פגישה ראשונה", result: { lp: 1 }, type: "match" });
      expect(u).toMatchObject({ notes: "דיברנו על השנה האישית", followUp: "2026-11-01", title: "פגישה ראשונה", type: "map", result: r.result });
      expect(u.updatedAt).not.toBe(r.updatedAt);
      await expect(store.readings.update(r.id, { followUp: "2026-02-30" })).rejects.toBeInstanceOf(ValidationError);
    });

    it("removes a reading and keeps its attachments, unlinked", async () => {
      const r = await store.readings.create(mapReading(client.id));
      const a = await store.attachments.add({ clientId: client.id, readingId: r.id, name: "notes.txt", type: "text/plain", bytes: bytes(1, 2) });
      await store.readings.remove(r.id);
      await expect(store.readings.get(r.id)).rejects.toBeInstanceOf(NotFoundError);
      expect(await store.attachments.listByClient(client.id)).toEqual([{ ...a, readingId: null }]);
    });

    it("lists recent readings across clients", async () => {
      const other = await store.clients.create({ fullName: "אחרת", birthDate: "1985-01-01" });
      for (const id of [client.id, other.id, client.id]) {
        tick();
        await store.readings.create(mapReading(id));
      }
      const recent = await store.readings.listRecent(2);
      expect(recent.map((r) => r.clientId)).toEqual([client.id, other.id]);
    });
  });

  describe("attachments", () => {
    let client;
    beforeEach(async () => {
      client = await store.clients.create({ fullName: "שני" });
    });

    it("round-trips the bytes and type", async () => {
      const a = await store.attachments.add({ clientId: client.id, name: "C:\\fakepath\\מפה.pdf", type: "application/pdf", bytes: bytes(37, 80, 68, 70) });
      expect(a).toMatchObject({ clientId: client.id, readingId: null, name: "מפה.pdf", type: "application/pdf", size: 4 });
      const blob = await store.attachments.getBlob(a.id);
      expect(blob.type).toBe("application/pdf");
      expect([...blob.bytes]).toEqual([37, 80, 68, 70]);
      expect(await store.attachments.listByClient(client.id)).toEqual([a]);
    });

    it("accepts an ArrayBuffer and refuses files over the limit", async () => {
      const a = await store.attachments.add({ clientId: client.id, name: "x.bin", type: "", bytes: new ArrayBuffer(3) });
      expect(a.size).toBe(3);
      await expect(store.attachments.add({ clientId: client.id, name: "big.bin", type: "", bytes: new Uint8Array(LIMITS.attachmentBytes + 1) }))
        .rejects.toBeInstanceOf(ValidationError);
    });

    it("needs an existing client and, when given, an existing reading", async () => {
      await expect(store.attachments.add({ clientId: "ghost", name: "a", type: "", bytes: bytes(1) })).rejects.toBeInstanceOf(NotFoundError);
      await expect(store.attachments.add({ clientId: client.id, readingId: "ghost", name: "a", type: "", bytes: bytes(1) })).rejects.toBeInstanceOf(NotFoundError);
    });

    it("removes the file and its bytes", async () => {
      const a = await store.attachments.add({ clientId: client.id, name: "a.txt", type: "text/plain", bytes: bytes(1) });
      await store.attachments.remove(a.id);
      expect(await store.attachments.listByClient(client.id)).toEqual([]);
      await expect(store.attachments.getBlob(a.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it("removing a client removes its readings, attachments and bytes, and nobody else's", async () => {
    const a = await store.clients.create({ fullName: "א", birthDate: "1990-01-01" });
    const b = await store.clients.create({ fullName: "ב", birthDate: "1991-01-01" });
    const ra = await store.readings.create(mapReading(a.id));
    const rb = await store.readings.create(mapReading(b.id));
    const fa = await store.attachments.add({ clientId: a.id, readingId: ra.id, name: "a", type: "", bytes: bytes(1) });
    const fb = await store.attachments.add({ clientId: b.id, name: "b", type: "", bytes: bytes(2) });
    await store.clients.remove(a.id);
    await expect(store.clients.get(a.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(store.readings.get(ra.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(store.attachments.getBlob(fa.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await store.readings.get(rb.id)).toEqual(rb);
    expect([...(await store.attachments.getBlob(fb.id)).bytes]).toEqual([2]);
  });

  it("summary: due follow-ups and this month's birthdays", async () => {
    const dana = await store.clients.create({ fullName: "דנה", birthDate: "1988-10-20" });
    const tamar = await store.clients.create({ fullName: "תמר", birthDate: "1995-10-03" });
    await store.clients.create({ fullName: "נועה", birthDate: "1990-03-03" });
    await store.clients.create({ fullName: "ללא תאריך" });
    const r1 = await store.readings.create(mapReading(dana.id, { followUp: "2026-10-04" }));
    await store.readings.create(mapReading(tamar.id, { followUp: "2026-10-05" }));
    await store.readings.create(mapReading(tamar.id, { followUp: "2026-10-06" }));
    const s = await store.summary(new Date(2026, 9, 5, 12));
    expect(s.clients).toBe(4);
    expect(s.readings).toBe(3);
    expect(s.followUps.map((f) => [f.clientName, f.followUp])).toEqual([["דנה", "2026-10-04"], ["תמר", "2026-10-05"]]);
    expect(s.followUps[0].readingId).toBe(r1.id);
    expect(s.birthdays.map((b) => [b.fullName, b.day, b.turning])).toEqual([["תמר", 3, 31], ["דנה", 20, 38]]);
  });

  describe("backup", () => {
    const seed = async (s) => {
      const c = await s.clients.create({ fullName: "שני כהן", birthDate: "1990-08-15", notes: "לקוחה קבועה" });
      const r = await s.readings.create(mapReading(c.id, { notes: "פגישה ראשונה" }));
      await s.attachments.add({ clientId: c.id, readingId: r.id, name: "מפה.pdf", type: "application/pdf", bytes: bytes(0, 255, 128, 7) });
      return { c, r };
    };

    it("export then import into an empty store reproduces everything, bytes included", async () => {
      await seed(store);
      const backup = await store.exportAll();
      expect(backup).toMatchObject({ format: "numerology-workspace-backup", version: 1 });
      const json = JSON.parse(JSON.stringify(backup)); // what a file round-trip does
      const fresh = await makeStore();
      expect(await fresh.importAll(json, { mode: "replace" })).toEqual({ clients: 1, readings: 1, attachments: 1 });
      expect(await fresh.clients.list()).toEqual(await store.clients.list());
      const [c] = await fresh.clients.list();
      expect(await fresh.readings.listByClient(c.id)).toEqual(await store.readings.listByClient(c.id));
      const [a] = await fresh.attachments.listByClient(c.id);
      expect([...(await fresh.attachments.getBlob(a.id)).bytes]).toEqual([0, 255, 128, 7]);
    });

    it("merge keeps whichever copy was updated last", async () => {
      const { c } = await seed(store);
      const backup = JSON.parse(JSON.stringify(await store.exportAll()));
      tick();
      await store.clients.update(c.id, { notes: "עודכן אחרי הגיבוי" });
      const counts = await store.importAll(backup, { mode: "merge" });
      expect(counts.clients).toBe(0);
      expect((await store.clients.get(c.id)).notes).toBe("עודכן אחרי הגיבוי");
      backup.clients[0].updatedAt = "2030-01-01T00:00:00.000Z";
      backup.clients[0].notes = "חדש יותר בגיבוי";
      await store.importAll(backup, { mode: "merge" });
      expect((await store.clients.get(c.id)).notes).toBe("חדש יותר בגיבוי");
    });

    it("rejects a malformed backup before writing anything", async () => {
      await seed(store);
      const good = JSON.parse(JSON.stringify(await store.exportAll()));
      const before = await store.exportAll();
      const broken = [
        { ...good, format: "something-else" },
        { ...good, readings: [{ ...good.readings[0], clientId: "ghost" }] },
        { ...good, clients: [{ ...good.clients[0], fullName: "" }] },
        { ...good, attachments: [{ ...good.attachments[0], data: "%%%not base64%%%" }] },
      ];
      for (const b of broken) await expect(store.importAll(b, { mode: "replace" })).rejects.toBeInstanceOf(ValidationError);
      expect(await store.exportAll()).toEqual(before);
    });
  });
});
