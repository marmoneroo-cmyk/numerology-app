import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { openWorkspaceStore } from "../open.js";

describe("openWorkspaceStore", () => {
  it("uses IndexedDB when the browser has it, and keeps data between openings", async () => {
    const a = await openWorkspaceStore({ name: "open-test" });
    expect(a.persistent).toBe(true);
    await a.clients.create({ fullName: "שני" });
    const b = await openWorkspaceStore({ name: "open-test" });
    expect((await b.clients.list()).map((c) => c.fullName)).toEqual(["שני"]);
  });

  it("falls back to memory when storage is refused, and says so", async () => {
    const refusing = { open: () => { throw new Error("SecurityError"); } };
    const s = await openWorkspaceStore({ name: "x", idb: refusing });
    expect(s.persistent).toBe(false);
    await s.clients.create({ fullName: "זמני" });
    expect(await s.clients.list()).toHaveLength(1);
  });
});
