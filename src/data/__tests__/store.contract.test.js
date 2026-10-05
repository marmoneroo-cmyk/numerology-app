/*
 * The store contract. Every backend runs this same suite, so the workspace
 * behaves identically on this device (IndexedDB), in memory, and - in step 3 -
 * on the server.
 */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createStore, NotFoundError, randomId, WIPED_PERSON } from "../store.js";
import { memoryBackend } from "../memoryBackend.js";
import { idbBackend } from "../idbBackend.js";
import { ValidationError, LIMITS } from "../validation.js";
import { ENGINE_VERSION, fullCalc, matchReading, yearCycle } from "../../engine/index.js";

let dbCounter = 0;
const BACKENDS = [
  ["memory", async () => memoryBackend()],
  ["IndexedDB", async () => idbBackend(`contract-${++dbCounter}`)],
];

// real engine snapshots, as the workspace saves them
const START = Date.UTC(2026, 9, 5, 9, 0, 0);
const COMPUTED = new Date(START);
const SHANI = { d: 15, m: 8, y: 1990, name: "שני כהן" };
const AVIR = { d: 3, m: 11, y: 1987, name: "אביר" };
const MAP_RESULT = fullCalc(SHANI.d, SHANI.m, SHANI.y, SHANI.name, false, COMPUTED);
const meta = { engineVersion: ENGINE_VERSION, computedFor: COMPUTED.toISOString() };
const mapReading = (clientId, over = {}) => ({
  clientId, type: "map", input: { name: SHANI.name, birthDate: "1990-08-15", add: false }, result: MAP_RESULT, ...meta, ...over,
});
const yearReading = (clientId) => ({
  clientId, type: "yearCycle", input: { birthDate: "1990-08-15", add: false }, result: { proj: yearCycle(SHANI.d, SHANI.m, false, COMPUTED) }, ...meta,
});
/** A love match saved in `clientId`'s file, with Avir as the other person (a client of their own when otherClientId is given). */
const loveReading = (clientId, otherClientId = null) => ({
  clientId, type: "match",
  input: { person: { name: SHANI.name, birthDate: "1990-08-15" }, other: { name: AVIR.name, birthDate: "1987-11-03", clientId: otherClientId }, matchType: "love" },
  result: matchReading(SHANI, AVIR, "love"), ...meta,
});

const bytes = (...xs) => new Uint8Array(xs);
const json = (x) => JSON.parse(JSON.stringify(x)); // what a round-trip through a file does
const DAY = 24 * 60 * 60 * 1000;

describe("randomId", () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("makes v4 UUIDs, also where crypto.randomUUID is missing (a page served over plain http)", () => {
    expect(randomId()).toMatch(UUID);
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const ids = Array.from({ length: 50 }, randomId);
      ids.forEach((id) => expect(id).toMatch(UUID));
      expect(new Set(ids).size).toBe(50);
    } finally {
      delete crypto.randomUUID;
    }
    expect(randomId()).toMatch(UUID);
  });
});

describe.each(BACKENDS)("store on %s", (_, makeBackend) => {
  let store, t;
  const tick = (ms = 60000) => {
    t += ms;
  };
  /** A store over `backend` (a fresh one by default) on the test clock, with readable ids. */
  const makeStore = async (backend, prefix = "id") => {
    let n = 0;
    return createStore(backend ?? (await makeBackend()), { now: () => new Date(t), newId: () => `${prefix}-${++n}` });
  };

  beforeEach(async () => {
    t = START;
    store = await makeStore();
  });

  describe("clients", () => {
    it("creates a client with an id, timestamps and normalised fields", async () => {
      const c = await store.clients.create({ fullName: " שני כהן ", birthDate: "1990-08-15", tags: "vip, חלה", hacker: true });
      expect(c).toEqual({
        id: "id-1", fullName: "שני כהן", birthName: "", birthDate: "1990-08-15", phone: "", email: "",
        tags: ["vip", "חלה"], notes: "", consent: false, archived: false,
        createdAt: "2026-10-05T09:00:00.000Z", updatedAt: "2026-10-05T09:00:00.000Z", lastActivityAt: "2026-10-05T09:00:00.000Z",
      });
      expect(await store.clients.get("id-1")).toEqual(c);
    });

    it("lists the most recently active first, hiding archived ones unless asked", async () => {
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
      await expect(store.clients.remove("nope")).rejects.toBeInstanceOf(NotFoundError);
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

    it("stores the engine's snapshot exactly and lists newest first", async () => {
      tick();
      const r1 = await store.readings.create(mapReading(client.id));
      tick();
      const r2 = await store.readings.create(yearReading(client.id));
      expect(r1).toMatchObject({ clientId: client.id, type: "map", engineVersion: ENGINE_VERSION, notes: "", followUp: null });
      expect(r1.result).toEqual(MAP_RESULT);
      expect(r2.result).toEqual(yearReading(client.id).result);
      expect((await store.readings.listByClient(client.id)).map((r) => r.id)).toEqual([r2.id, r1.id]);
      expect(await store.readings.get(r1.id)).toEqual(r1);
    });

    it("needs an existing client and a snapshot of the right shape", async () => {
      await expect(store.readings.create(mapReading("ghost"))).rejects.toBeInstanceOf(NotFoundError);
      await expect(store.readings.create(mapReading(client.id, { result: { lp: 33 } }))).rejects.toBeInstanceOf(ValidationError);
      expect(await store.readings.listByClient(client.id)).toEqual([]);
    });

    it("saving a reading moves the client to the top without changing their edit time", async () => {
      tick();
      const other = await store.clients.create({ fullName: "אחרת" });
      tick();
      await store.readings.create(mapReading(client.id));
      const list = await store.clients.list();
      expect(list.map((c) => c.id)).toEqual([client.id, other.id]);
      expect(list[0]).toMatchObject({ updatedAt: client.updatedAt, lastActivityAt: "2026-10-05T09:02:00.000Z" });
    });

    it("lets you edit the title, notes and follow-up but never the snapshot", async () => {
      const r = await store.readings.create(mapReading(client.id));
      tick();
      const u = await store.readings.update(r.id, { notes: "דיברנו על השנה האישית", followUp: "2026-11-01", title: "פגישה ראשונה", result: { lp: 1 }, type: "match" });
      expect(u).toMatchObject({ notes: "דיברנו על השנה האישית", followUp: "2026-11-01", title: "פגישה ראשונה", type: "map", result: r.result });
      expect(u.updatedAt).not.toBe(r.updatedAt);
      await expect(store.readings.update(r.id, { followUp: "2026-02-30" })).rejects.toBeInstanceOf(ValidationError);
      expect(await store.readings.update(r.id, { followUp: null })).toMatchObject({ followUp: null, notes: "דיברנו על השנה האישית" });
    });

    it("removes a reading and keeps its attachments, unlinked", async () => {
      const r = await store.readings.create(mapReading(client.id));
      const a = await store.attachments.add({ clientId: client.id, readingId: r.id, name: "notes.txt", type: "text/plain", bytes: bytes(1, 2) });
      await store.readings.remove(r.id);
      await expect(store.readings.get(r.id)).rejects.toBeInstanceOf(NotFoundError);
      expect(await store.attachments.listByClient(client.id)).toEqual([{ ...a, readingId: null }]);
      await expect(store.readings.remove(r.id)).rejects.toBeInstanceOf(NotFoundError);
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

    it("needs an existing client and, when given, an existing reading of that same client", async () => {
      await expect(store.attachments.add({ clientId: "ghost", name: "a", type: "", bytes: bytes(1) })).rejects.toBeInstanceOf(NotFoundError);
      await expect(store.attachments.add({ clientId: client.id, readingId: "ghost", name: "a", type: "", bytes: bytes(1) })).rejects.toBeInstanceOf(NotFoundError);
      const other = await store.clients.create({ fullName: "אחרת", birthDate: "1985-01-01" });
      const theirs = await store.readings.create(mapReading(other.id));
      await expect(store.attachments.add({ clientId: client.id, readingId: theirs.id, name: "a", type: "", bytes: bytes(1) })).rejects.toBeInstanceOf(ValidationError);
      expect(await store.attachments.listByClient(client.id)).toEqual([]);
    });

    it("removes the file and its bytes", async () => {
      const a = await store.attachments.add({ clientId: client.id, name: "a.txt", type: "text/plain", bytes: bytes(1) });
      await store.attachments.remove(a.id);
      expect(await store.attachments.listByClient(client.id)).toEqual([]);
      await expect(store.attachments.getBlob(a.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(store.attachments.remove(a.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("removing a client", () => {
    it("removes its readings, attachments and bytes, and nobody else's", async () => {
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

    it("wipes their name and birth date from other clients' readings, keeping the rest", async () => {
      const avir = await store.clients.create({ fullName: "אביר", birthDate: "1987-11-03" });
      const shani = await store.clients.create({ fullName: "שני", birthDate: "1990-08-15" });
      const linked = await store.readings.create(loveReading(shani.id, avir.id));
      const typed = await store.readings.create(loveReading(shani.id));
      tick();
      await store.clients.remove(avir.id);
      const after = await store.readings.get(linked.id);
      expect(after.input.other).toEqual(WIPED_PERSON);
      expect(after.input.person).toEqual(linked.input.person);
      expect(after.result).toEqual(linked.result);
      // a typed-in name is not linked to any client, so it stays
      expect(await store.readings.get(typed.id)).toEqual(typed);
      // and the wiped reading can still be edited
      expect(await store.readings.update(linked.id, { notes: "אחרי המחיקה" })).toMatchObject({ notes: "אחרי המחיקה" });
    });
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

  it("a save in another tab never brings a just-deleted client back", async () => {
    const shared = await makeBackend();
    const tab1 = await makeStore(shared, "tab1");
    const c = await tab1.clients.create({ fullName: "שני", birthDate: "1990-08-15", phone: "052-1234567" });
    // tab 2 has read the client and is about to save a reading; its write waits until tab 1's deletion is done
    let deletionDone;
    const deleted = new Promise((resolve) => {
      deletionDone = resolve;
    });
    const tab2 = await makeStore({
      ...shared,
      batch: async (ops) => {
        await Promise.race([deleted, new Promise((resolve) => setTimeout(resolve, 50))]);
        return shared.batch(ops);
      },
    }, "tab2");
    const saving = tab2.readings.create(mapReading(c.id)).catch((e) => e);
    const deleting = tab1.clients.remove(c.id).then(deletionDone);
    await Promise.all([saving, deleting]);
    // whichever went first, the client stays deleted and nothing of theirs is left
    await expect(tab1.clients.get(c.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await tab1.readings.listRecent()).toEqual([]);
  });

  it("every change that touches several records is one all-or-nothing write", async () => {
    const backend = await makeBackend();
    const s = await makeStore(backend);
    const c = await s.clients.create({ fullName: "שני", birthDate: "1990-08-15" });
    const r = await s.readings.create(mapReading(c.id));
    const f = await s.attachments.add({ clientId: c.id, readingId: r.id, name: "a.txt", type: "text/plain", bytes: bytes(1) });
    const elsewhere = await makeStore(undefined, "other");
    await elsewhere.clients.create({ fullName: "מגיבוי" });
    const backup = json(await elsewhere.exportAll());
    const before = await s.exportAll();

    // the same data, but the disk fails on every multi-record write
    const failing = await makeStore({ ...backend, batch: async () => { throw new Error("disk full"); } }, "new");
    const attempts = [
      () => failing.clients.remove(c.id),
      () => failing.readings.create(mapReading(c.id)),
      () => failing.readings.remove(r.id),
      () => failing.attachments.add({ clientId: c.id, name: "b.txt", type: "", bytes: bytes(2) }),
      () => failing.attachments.remove(f.id),
      () => failing.importAll(backup),
    ];
    for (const attempt of attempts) await expect(attempt()).rejects.toThrow("disk full");
    expect(await s.exportAll()).toEqual(before);
  });

  describe("backup", () => {
    const seed = async (s) => {
      const c = await s.clients.create({ fullName: "שני כהן", birthDate: "1990-08-15", notes: "לקוחה קבועה" });
      const r = await s.readings.create(mapReading(c.id, { notes: "פגישה ראשונה" }));
      const a = await s.attachments.add({ clientId: c.id, readingId: r.id, name: "מפה.pdf", type: "application/pdf", bytes: bytes(0, 255, 128, 7) });
      return { c, r, a };
    };

    it("export then restore into an empty store reproduces everything, bytes included", async () => {
      await seed(store);
      const backup = await store.exportAll();
      expect(backup).toMatchObject({ format: "numerology-workspace-backup", version: 1, missingFiles: 0 });
      const fresh = await makeStore();
      expect(await fresh.importAll(json(backup))).toEqual({ clients: 1, readings: 1, attachments: 1 });
      expect(await fresh.clients.list()).toEqual(await store.clients.list());
      const [c] = await fresh.clients.list();
      expect(await fresh.readings.listByClient(c.id)).toEqual(await store.readings.listByClient(c.id));
      const [a] = await fresh.attachments.listByClient(c.id);
      expect([...(await fresh.attachments.getBlob(a.id)).bytes]).toEqual([0, 255, 128, 7]);
    });

    it("a client is replaced only by a newer copy of itself", async () => {
      const { c } = await seed(store);
      const backup = json(await store.exportAll());
      tick();
      await store.clients.update(c.id, { notes: "עודכן אחרי הגיבוי" });
      expect(await store.importAll(backup)).toEqual({ clients: 0, readings: 0, attachments: 0 });
      expect((await store.clients.get(c.id)).notes).toBe("עודכן אחרי הגיבוי");
      tick();
      backup.clients[0].updatedAt = new Date(t).toISOString();
      backup.clients[0].notes = "חדש יותר בגיבוי";
      expect(await store.importAll(backup)).toEqual({ clients: 1, readings: 0, attachments: 0 });
      expect((await store.clients.get(c.id)).notes).toBe("חדש יותר בגיבוי");
    });

    it("never replaces a saved reading or file, and never moves one to another client", async () => {
      const { c, r, a } = await seed(store);
      const other = await store.clients.create({ fullName: "אחרת", birthDate: "1985-01-01" });
      const backup = json(await store.exportAll());
      backup.readings[0] = { ...backup.readings[0], notes: "זויף", clientId: other.id };
      backup.attachments[0] = { ...backup.attachments[0], name: "evil.exe", type: "text/html", clientId: other.id, readingId: null };
      expect(await store.importAll(backup)).toEqual({ clients: 0, readings: 0, attachments: 0 });
      expect(await store.readings.get(r.id)).toMatchObject({ clientId: c.id, notes: "פגישה ראשונה" });
      expect(await store.attachments.listByClient(c.id)).toEqual([a]);
      expect(await store.attachments.listByClient(other.id)).toEqual([]);
    });

    it("brings timestamps from the future back to the time of the restore, without letting them win", async () => {
      const { c } = await seed(store);
      const backup = json(await store.exportAll());
      const future = new Date(t + 2 * DAY).toISOString();
      Object.assign(backup.clients[0], { updatedAt: future, notes: "מהעתיד" });
      backup.readings[0].createdAt = future;
      backup.attachments[0].createdAt = future;
      // into an empty workspace everything comes in, stamped with the time of the restore
      const fresh = await makeStore();
      expect(await fresh.importAll(backup)).toEqual({ clients: 1, readings: 1, attachments: 1 });
      const restoredAt = new Date(t).toISOString();
      expect(await fresh.clients.get(c.id)).toMatchObject({ notes: "מהעתיד", updatedAt: restoredAt });
      expect((await fresh.readings.listByClient(c.id))[0].createdAt).toBe(restoredAt);
      expect((await fresh.attachments.listByClient(c.id))[0].createdAt).toBe(restoredAt);
      // over an existing copy, a date from the future is no proof of being newer, even once brought back to now
      tick();
      expect(await store.importAll(backup)).toEqual({ clients: 0, readings: 0, attachments: 0 });
      expect((await store.clients.get(c.id)).notes).toBe("לקוחה קבועה");
    });

    it("refuses a backup whose new file would tie another client to a reading saved here", async () => {
      const { r } = await seed(store);
      const other = await store.clients.create({ fullName: "אחרת", birthDate: "1985-01-01" });
      const backup = json(await store.exportAll());
      backup.readings = [{ ...backup.readings[0], clientId: other.id }];
      backup.attachments = [{ ...backup.attachments[0], id: "new-file", clientId: other.id, readingId: r.id }];
      const before = await store.exportAll();
      await expect(store.importAll(backup)).rejects.toBeInstanceOf(ValidationError);
      expect(await store.exportAll()).toEqual(before);
    });

    it("a reading restored from another device moves its client up, as if it was saved here", async () => {
      const { c } = await seed(store);
      tick();
      const other = await store.clients.create({ fullName: "אחרת" });
      const device2 = await makeStore(undefined, "device2");
      await device2.importAll(json(await store.exportAll()));
      tick();
      await device2.readings.create(mapReading(c.id));
      expect(await store.importAll(json(await device2.exportAll()))).toEqual({ clients: 0, readings: 1, attachments: 0 });
      expect((await store.clients.list()).map((x) => x.id)).toEqual([c.id, other.id]);
      expect((await store.clients.get(c.id)).updatedAt).toBe(c.updatedAt);
    });

    it("a backup taken while a client is being deleted still restores", async () => {
      const backend = await makeBackend();
      const s = await makeStore(backend);
      const { c } = await seed(s);
      await s.clients.create({ fullName: "נשארת" });
      // the deletion lands in the middle of the export: right after it has read a file's bytes
      let armed = true;
      const racing = await makeStore({
        ...backend,
        getBlob: async (id) => {
          const blob = await backend.getBlob(id);
          if (armed) {
            armed = false;
            await s.clients.remove(c.id);
          }
          return blob;
        },
      }, "racing");
      const backup = json(await racing.exportAll());
      await expect((await makeStore()).importAll(backup)).resolves.toBeTruthy();
    });

    it("normalises restored timestamps", async () => {
      await seed(store);
      const backup = json(await store.exportAll());
      backup.clients[0].createdAt = "2026-10-05T12:00:00+03:00";
      delete backup.clients[0].lastActivityAt;
      const fresh = await makeStore();
      await fresh.importAll(backup);
      const [c] = await fresh.clients.list();
      expect(c).toMatchObject({ createdAt: "2026-10-05T09:00:00.000Z", lastActivityAt: c.updatedAt });
    });

    it("has no replace mode", async () => {
      await seed(store);
      const backup = json(await store.exportAll());
      const fresh = await makeStore();
      await expect(fresh.importAll(backup, { mode: "replace" })).rejects.toBeInstanceOf(ValidationError);
      expect(await fresh.clients.list({ includeArchived: true })).toEqual([]);
    });

    it("rejects a malformed or forged backup before writing anything", async () => {
      const { c } = await seed(store);
      const good = json(await store.exportAll());
      const other = { ...good.clients[0], id: "client-2", fullName: "אחרת" };
      const broken = [
        { ...good, format: "something-else" },
        { ...good, version: 2 },
        { ...good, clients: "all of them" },
        { ...good, readings: [{ ...good.readings[0], clientId: "ghost" }] },
        { ...good, readings: [{ ...good.readings[0], result: { lp: 33 } }] },
        { ...good, readings: [{ ...good.readings[0], type: "constructor" }] },
        { ...good, clients: [{ ...good.clients[0], fullName: "" }] },
        { ...good, clients: [{ ...good.clients[0], createdAt: "yesterday" }] },
        { ...good, clients: [{ ...good.clients[0], createdAt: "-000001-01-01T00:00:00.000Z" }] },
        { ...good, attachments: [{ ...good.attachments[0], data: "%%%not base64%%%" }] },
        // a file of one client linked to a reading of another
        { ...good, clients: [...good.clients, other], attachments: [{ ...good.attachments[0], clientId: other.id }] },
        // the same record twice: which copy wins would be anyone's guess
        { ...good, clients: [good.clients[0], { ...good.clients[0], notes: "עותק ישן" }] },
        { ...good, readings: [good.readings[0], good.readings[0]] },
        { ...good, attachments: [good.attachments[0], good.attachments[0]] },
      ];
      expect(good.attachments[0].readingId).toBe(good.readings[0].id);
      expect(good.readings[0].clientId).toBe(c.id);
      for (const b of broken) {
        const fresh = await makeStore();
        await expect(fresh.importAll(b)).rejects.toBeInstanceOf(ValidationError);
        expect(await fresh.clients.list({ includeArchived: true })).toEqual([]);
        expect(await fresh.readings.listRecent()).toEqual([]);
      }
    });

    it("export leaves out a file whose bytes are gone, and counts it", async () => {
      const backend = await makeBackend();
      const s = await makeStore(backend);
      const { a } = await seed(s);
      await backend.deleteBlob(a.id);
      const backup = await s.exportAll();
      expect(backup.attachments).toEqual([]);
      expect(backup.missingFiles).toBe(1);
      const fresh = await makeStore();
      expect(await fresh.importAll(json(backup))).toEqual({ clients: 1, readings: 1, attachments: 0 });
    });
  });
});
