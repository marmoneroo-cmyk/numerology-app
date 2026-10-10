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

  it("leaves the lab an admin over the same sample data", async () => {
    expect(LAB_PROFILE.role).toBe("admin");
    expect((await labService().claim()).profile).toEqual(LAB_PROFILE);
    expect(await ids(labService())).toEqual(await ids(demoService()));
  });
});
