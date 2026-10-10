/* The demo's account: a signed-in subscriber over sample clients, in memory. The lab keeps its admin. */
import { describe, it, expect } from "vitest";
import { demoService, DEMO_PROFILE } from "../sampleAccount.js";
import { labService, LAB_PROFILE } from "../../lab/labAccount.js";

const ids = async (svc) => (await svc.client.rpc("ws_all", { p_store: "clients" })).data.map((c) => c.id);

describe("the demo account", () => {
  it("is a signed-in subscriber past two-step verification, never an admin", async () => {
    const svc = demoService();
    expect(await svc.savedSession()).toBeTruthy();
    expect(await svc.mfaState()).toMatchObject({ level: "aal2", needsCode: false });
    const claimed = await svc.claim();
    expect(claimed).toMatchObject({ status: "ok", profile: DEMO_PROFILE });
    expect(claimed.profile.role).toBe("subscriber");
  });

  it("starts each copy from the same sample clients, in memory", async () => {
    const first = demoService();
    const second = demoService();
    await first.client.rpc("ws_batch", { p_ops: [{ type: "delete", store: "clients", id: "c1" }] });
    expect(await ids(first)).not.toContain("c1");
    expect(await ids(second)).toContain("c1");
  });

  it("answers the workspace calls the server answers: one record, a snapshot, a refused unknown call", async () => {
    const { client } = demoService();
    expect((await client.rpc("ws_get", { p_store: "clients", p_id: "c4" })).data).toMatchObject({ fullName: "דנה שמיר", tags: ["VIP"] });
    expect((await client.rpc("ws_get", { p_store: "clients", p_id: "nobody" })).data).toBeNull();
    const snapshot = (await client.rpc("ws_snapshot")).data;
    expect(snapshot.clients).toHaveLength(6);
    expect(snapshot.readings).toEqual([]);
    expect((await client.rpc("admin_list_accounts")).error).toMatchObject({ code: "PGRST202" });
    await client.rpc("ws_batch", { p_ops: [{ type: "put", store: "readings", value: { id: "r1", clientId: "c1" } }] });
    expect((await client.rpc("ws_all", { p_store: "readings" })).data).toEqual([{ id: "r1", clientId: "c1" }]);
  });

  it("keeps files in memory: up, down and away", async () => {
    const bucket = demoService().client.storage.from("attachments");
    await bucket.upload("demo/a.txt", new Blob(["hello"], { type: "text/plain" }));
    const { data } = await bucket.download("demo/a.txt");
    expect(data.type).toBe("text/plain");
    expect(await data.text()).toBe("hello");
    await bucket.remove(["demo/a.txt"]);
    expect((await bucket.download("demo/a.txt")).error).toMatchObject({ statusCode: "404" });
  });

  it("answers the account screen's calls without a server", async () => {
    const svc = demoService();
    expect(await svc.status()).toEqual({ status: "ok" });
    expect(await svc.signIn()).toEqual({ ok: true });
    expect((await svc.myDevices())[0]).toMatchObject({ current: true, status: "approved" });
    expect((await svc.mfaEnroll()).uri.startsWith("otpauth://")).toBe(true);
    for (const call of [svc.updateProfile, svc.revokeMyDevice, svc.logEvent]) expect(await call()).toEqual({ status: "ok" });
    await expect(svc.changePassword()).resolves.toBeUndefined();
    await expect(svc.signOut()).resolves.toBeUndefined();
    expect(typeof svc.watch()).toBe("function");
    expect(typeof svc.onSignedOut()).toBe("function");
    expect((await svc.admin.listAccounts())[0]).toMatchObject({ id: DEMO_PROFILE.id });
    expect(await svc.admin.createAccount()).toMatchObject({ warnings: [] });
  });

  it("leaves the lab an admin over the same sample data", async () => {
    expect(LAB_PROFILE.role).toBe("admin");
    expect((await labService().claim()).profile).toEqual(LAB_PROFILE);
    expect(await ids(labService())).toEqual(await ids(demoService()));
  });
});
