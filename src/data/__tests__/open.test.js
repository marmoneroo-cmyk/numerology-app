import "fake-indexeddb/auto";
import { describe, it, expect, afterEach, vi } from "vitest";
import { openWorkspaceStore } from "../open.js";

describe("openWorkspaceStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses IndexedDB when the browser has it, and keeps data between openings", async () => {
    const a = await openWorkspaceStore({ name: "open-test" });
    expect(a.persistent).toBe(true);
    await a.clients.create({ fullName: "שני" });
    const b = await openWorkspaceStore({ name: "open-test" });
    expect((await b.clients.list()).map((c) => c.fullName)).toEqual(["שני"]);
  });

  it("opens each workspace once: later calls share the same store", async () => {
    const first = openWorkspaceStore({ name: "open-once" });
    const second = openWorkspaceStore({ name: "open-once" });
    expect(second).toBe(first);
    expect(await second).toBe(await first);
    expect(await openWorkspaceStore({ name: "open-other" })).not.toBe(await first);
  });

  it("falls back to memory when storage is refused, says so, and keeps it for the visit", async () => {
    const refusing = { open: () => { throw new Error("SecurityError"); } };
    const s = await openWorkspaceStore({ name: "refused", idb: refusing });
    expect(s.persistent).toBe(false);
    await s.clients.create({ fullName: "זמני" });
    const again = await openWorkspaceStore({ name: "refused", idb: refusing });
    expect(await again.clients.list()).toHaveLength(1);
  });

  it("asks the browser to keep the data without waiting for its answer", async () => {
    const persist = vi.fn(() => new Promise(() => {})); // never answers
    vi.stubGlobal("navigator", { storage: { persist } });
    const s = await openWorkspaceStore({ name: "open-persist" });
    expect(s.persistent).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("opens even when the browser refuses or lacks the request to keep data", async () => {
    vi.stubGlobal("navigator", { storage: { persist: () => Promise.reject(new Error("denied")) } });
    expect((await openWorkspaceStore({ name: "open-denied" })).persistent).toBe(true);
    vi.stubGlobal("navigator", { storage: { persist: () => { throw new Error("boom"); } } });
    expect((await openWorkspaceStore({ name: "open-throws" })).persistent).toBe(true);
    vi.stubGlobal("navigator", undefined);
    expect((await openWorkspaceStore({ name: "open-none" })).persistent).toBe(true);
  });
});
