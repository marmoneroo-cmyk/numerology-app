// @vitest-environment jsdom
/*
 * The workspace on a computer: the client list stays beside whatever is open
 * (a client, the client form, a new reading, a saved reading). On a phone it
 * is one screen at a time, as before. Other screens can ask it to open a client.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import WorkspaceApp from "../WorkspaceApp.jsx";
import { createStore } from "../../data/store.js";
import { memoryBackend } from "../../data/memoryBackend.js";

const NOW = new Date("2026-10-06T10:00:00Z");

/** A screen of the given width, as far as min-width media queries can tell. */
function screenWidth(width) {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const min = Number((query.match(/min-width: ([0-9]+)px/) || [])[1] || 0);
    return { matches: !query.includes("reduce") && width >= min, addEventListener() {}, removeEventListener() {} };
  });
}

async function seeded() {
  let n = 0;
  const store = createStore(memoryBackend(), { now: () => NOW, newId: () => `id-${++n}` });
  // birthdays outside October, so the "birthdays this month" panel stays empty and each name is one button
  await store.clients.create({ fullName: "רחל כהן", birthDate: "1985-03-08" });
  await store.clients.create({ fullName: "יוסי לוי", birthDate: "1990-05-11" });
  return store;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the workspace on a computer", () => {
  it("keeps the list beside the open client, and marks which one is open", async () => {
    screenWidth(1300);
    render(<WorkspaceApp store={await seeded()} now={() => NOW} />);
    const list = await screen.findByRole("region", { name: "רשימת הלקוחות" });
    const detail = screen.getByRole("region", { name: "הלקוח הפתוח" });
    expect(within(detail).getByText("בחרו לקוח מהרשימה, או פתחו לקוח חדש.")).toBeTruthy();
    fireEvent.click(await within(list).findByRole("button", { name: /רחל כהן/ }));
    expect(await within(detail).findByRole("heading", { name: "רחל כהן" })).toBeTruthy();
    // the list is still there, with the open client marked
    expect(within(list).getByRole("button", { name: /רחל כהן/ }).getAttribute("aria-current")).toBe("true");
    expect(within(list).getByRole("button", { name: /יוסי לוי/ }).getAttribute("aria-current")).toBeNull();
    fireEvent.click(within(list).getByRole("button", { name: /יוסי לוי/ }));
    expect(await within(detail).findByRole("heading", { name: "יוסי לוי" })).toBeTruthy();
  });

  it("shows a new client in the list as soon as it is saved", async () => {
    screenWidth(1300);
    render(<WorkspaceApp store={await seeded()} now={() => NOW} />);
    const list = await screen.findByRole("region", { name: "רשימת הלקוחות" });
    fireEvent.click(within(list).getByRole("button", { name: "לקוח חדש" }));
    const detail = screen.getByRole("region", { name: "הלקוח הפתוח" });
    fireEvent.change(await within(detail).findByLabelText("שם מלא"), { target: { value: "מיכל אברהם" } });
    fireEvent.click(within(detail).getByRole("button", { name: /שמירה|שמירת/ }));
    expect(await within(list).findByRole("button", { name: /מיכל אברהם/ })).toBeTruthy();
  });

  it("opens a client when another screen asks", async () => {
    screenWidth(1300);
    const store = await seeded();
    const { rerender } = render(<WorkspaceApp store={store} now={() => NOW} />);
    await screen.findByRole("region", { name: "רשימת הלקוחות" });
    rerender(<WorkspaceApp store={store} now={() => NOW} openRequest={{ view: { name: "client", clientId: "id-2" }, nonce: 1 }} />);
    const detail = screen.getByRole("region", { name: "הלקוח הפתוח" });
    expect(await within(detail).findByRole("heading", { name: "יוסי לוי" })).toBeTruthy();
  });
});

describe("the workspace on a phone", () => {
  it("shows one screen at a time, as before", async () => {
    screenWidth(390);
    render(<WorkspaceApp store={await seeded()} now={() => NOW} />);
    fireEvent.click(await screen.findByRole("button", { name: /רחל כהן/ }));
    expect(await screen.findByRole("heading", { name: "רחל כהן" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "רשימת הלקוחות" })).toBeNull();
    expect(screen.queryByRole("button", { name: /יוסי לוי/ })).toBeNull();
  });

  it("also opens a client when another screen asks", async () => {
    screenWidth(390);
    const store = await seeded();
    render(<WorkspaceApp store={store} now={() => NOW} openRequest={{ view: { name: "client", clientId: "id-1" }, nonce: 7 }} />);
    expect(await screen.findByRole("heading", { name: "רחל כהן" })).toBeTruthy();
  });
});
