// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { watchSession } from "../workspaceStore.js";
import LocalDataOffer from "../LocalDataOffer.jsx";
import { SessionError } from "../../data/serverBackend.js";
import { createStore } from "../../data/store.js";
import { memoryBackend } from "../../data/memoryBackend.js";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("watchSession", () => {
  it("tells the account when the server refuses the session, and still fails the call", async () => {
    const onLost = vi.fn();
    const backend = watchSession({ persistent: true, all: async () => { throw new SessionError(); }, get: async () => ({ id: "x" }) }, onLost);
    await expect(backend.all("clients")).rejects.toBeInstanceOf(SessionError);
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(await backend.get("clients", "x")).toEqual({ id: "x" });
    expect(backend.persistent).toBe(true);
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  it("does not raise the alarm for other failures", async () => {
    const onLost = vi.fn();
    const backend = watchSession({ all: async () => { throw new Error("offline"); } }, onLost);
    await expect(backend.all("clients")).rejects.toThrow("offline");
    expect(onLost).not.toHaveBeenCalled();
  });
});

describe("the offer to upload this device's client files", () => {
  async function setup({ deviceClients = ["רחל", "משה"], persistent = true } = {}) {
    const device = createStore(memoryBackend());
    for (const fullName of deviceClients) await device.clients.create({ fullName });
    const deviceStore = { ...device, persistent };
    const account = createStore(memoryBackend());
    const logEvent = vi.fn(async () => ({ status: "ok" }));
    const onUploaded = vi.fn();
    render(<LocalDataOffer store={account} userId="u1" he dk openDeviceStore={async () => deviceStore} logEvent={logEvent} onUploaded={onUploaded} />);
    return { account, logEvent, onUploaded };
  }

  it("offers the files saved here before the account, uploads them, and does not ask again", async () => {
    const { account, logEvent, onUploaded } = await setup();
    expect(await screen.findByText(/נמצאו במכשיר הזה 2 תיקי לקוחות/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "העתקה לחשבון" }));
    expect(await screen.findByText("הועתקו לחשבון: 2 לקוחות, 0 בדיקות, 0 קבצים")).toBeTruthy();
    expect((await account.clients.list()).map((c) => c.fullName).sort()).toEqual(["משה", "רחל"]);
    expect(logEvent).toHaveBeenCalledWith("local_data_uploaded");
    expect(onUploaded).toHaveBeenCalled();
    cleanup();
    await setup();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/נמצאו במכשיר הזה/)).toBeNull();
  });

  it("offers this device's files once, not again to another account signing in here", async () => {
    await setup();
    fireEvent.click(await screen.findByRole("button", { name: "העתקה לחשבון" }));
    await screen.findByText(/הועתקו לחשבון/);
    cleanup();
    const device = createStore(memoryBackend());
    await device.clients.create({ fullName: "רחל" });
    render(<LocalDataOffer store={createStore(memoryBackend())} userId="someone-else" he dk openDeviceStore={async () => ({ ...device, persistent: true })} logEvent={vi.fn(async () => ({}))} onUploaded={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/נמצאו במכשיר הזה/)).toBeNull();
  });

  it("stays quiet when this device holds nothing, or keeps nothing", async () => {
    await setup({ deviceClients: [] });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/נמצאו במכשיר הזה/)).toBeNull();
    cleanup();
    await setup({ persistent: false });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/נמצאו במכשיר הזה/)).toBeNull();
  });

  it("can be put off for this visit", async () => {
    await setup();
    fireEvent.click(await screen.findByRole("button", { name: "לא עכשיו" }));
    await waitFor(() => expect(screen.queryByText(/נמצאו במכשיר הזה/)).toBeNull());
  });
});
