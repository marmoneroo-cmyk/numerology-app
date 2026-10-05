// @vitest-environment jsdom
/*
 * The workspace as a practitioner uses it, end to end, on an in-memory store.
 * Every screen loads its data asynchronously, so the first click on a screen
 * waits for its button (tap), later clicks on the same screen do not.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import WorkspaceApp from "../WorkspaceApp.jsx";
import { ContentContext } from "../content.js";
import { createStore } from "../../data/store.js";
import { memoryBackend } from "../../data/memoryBackend.js";
import { matchReading } from "../../engine/index.js";
import { personOf } from "../format.js";

const NOW = new Date(2026, 9, 5, 12);
const CONTENT = {
  D: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, { t: `ארכיטיפ ${n}`, te: `Archetype ${n}` }])),
  MASTER: { 11: { t: "מאסטר 11" }, 22: { t: "מאסטר 22" }, 33: { t: "מאסטר 33" } },
  KARMA: { 13: { he: "חוב 13", en: "Debt 13" }, 14: { he: "חוב 14", en: "Debt 14" }, 16: { he: "חוב 16", en: "Debt 16" }, 19: { he: "חוב 19", en: "Debt 19" } },
  YEAR_ENERGY: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, { he: `אנרגיית שנה ${n}`, en: `Year ${n}` }])),
  LP_COMPAT: { "3-6": { he: { con: "אהבה, יופי ויצירה", ch: "אתגר 3-6", tip: "עצה 3-6" }, en: { con: "love", ch: "challenge", tip: "tip" } } },
  getCompat: (a, b) => CONTENT.LP_COMPAT[`${Math.min(a, b)}-${Math.max(a, b)}`] || null,
  exportReport: vi.fn(),
};

async function setup(seed) {
  let n = 0;
  let t = NOW.getTime();
  const store = createStore(memoryBackend(), { now: () => new Date((t += 1000)), newId: () => `id-${++n}` });
  if (seed) await seed(store);
  render(
    <ContentContext.Provider value={CONTENT}>
      <WorkspaceApp he dk store={store} now={() => NOW} />
    </ContentContext.Provider>,
  );
  return store;
}
const SHANI = { fullName: "שני כהן אזולאי", birthDate: "1990-08-15" };
const AVIR = { fullName: "אביר אזולאי", birthDate: "1987-11-03" };
const click = (name) => fireEvent.click(screen.getByRole("button", { name }));
const tap = async (name) => fireEvent.click(await screen.findByRole("button", { name }));
const tapTab = async (name) => fireEvent.click(await screen.findByRole("tab", { name }));
const openClient = (name) => tap(new RegExp(name));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete URL.createObjectURL; // jsdom has no object URLs; the backup test defines them
  delete URL.revokeObjectURL;
});

describe("workspace", () => {
  it("starts empty, adds a client and opens their file with the core numbers", async () => {
    await setup();
    expect(await screen.findByText(/עוד אין לקוחות/)).toBeTruthy();
    click("לקוח חדש");
    fireEvent.change(await screen.findByLabelText("שם מלא"), { target: { value: "שני כהן אזולאי" } });
    fireEvent.change(screen.getByLabelText("תאריך לידה"), { target: { value: "15.08.1990" } });
    click("שמירה");
    expect(await screen.findByRole("heading", { name: "שני כהן אזולאי" })).toBeTruthy();
    expect(screen.getByTestId("num-lp").textContent).toContain("33");
    expect(screen.getByTestId("num-nv").textContent).toContain("4");
    expect(screen.getByText(/גיל 36/)).toBeTruthy();
  });

  it("shows Hebrew validation messages and keeps the form open", async () => {
    await setup();
    await tap("לקוח חדש");
    fireEvent.change(await screen.findByLabelText("תאריך לידה"), { target: { value: "31.02.1990" } });
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "nope" } });
    click("שמירה");
    expect(await screen.findByText("חובה למלא שם")).toBeTruthy();
    expect(screen.getByText("תאריך לא תקין (dd.mm.yyyy)")).toBeTruthy();
    expect(screen.getByText("כתובת מייל לא תקינה")).toBeTruthy();
    expect(screen.getByLabelText("שם מלא")).toBeTruthy();
  });

  it("saves a full map reading from the client's file and shows it from the stored snapshot", async () => {
    let client;
    const store = await setup(async (s) => { client = await s.clients.create(SHANI); });
    await openClient("שני כהן אזולאי");
    await tap("בדיקה חדשה");
    await tap("חשב ושמור");
    expect(await screen.findByText("גרסת מנוע 1.0.0")).toBeTruthy();
    expect(screen.getByTestId("num-lp").textContent).toContain("33");
    expect(screen.getByTestId("num-py").textContent).toContain("6");
    const [saved] = await store.readings.listByClient(client.id);
    expect(saved).toMatchObject({ type: "map", engineVersion: "1.0.0", computedFor: NOW.toISOString(), result: { lp: 33, nv: 4, py: 6 } });
    click("חזרה לתיק");
    expect(await screen.findByText("שביל הגורל 33 · ערך השם 4 · שנה אישית 6")).toBeTruthy();
  });

  it("matches the client with another client and shows the score and the compatibility text", async () => {
    await setup(async (s) => {
      await s.clients.create(AVIR);
      await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    await tap("בדיקה חדשה");
    await tapTab("התאמה");
    const picker = await screen.findByLabelText("בחירה מהלקוחות");
    const avir = within(picker).getByRole("option", { name: /אביר אזולאי/ });
    fireEvent.change(picker, { target: { value: avir.value } });
    click("חשב ושמור");
    const expected = matchReading(personOf("שני כהן אזולאי", "1990-08-15"), personOf("אביר אזולאי", "1987-11-03"), "love");
    expect(await screen.findByText(`${expected.score}%`)).toBeTruthy();
    expect(screen.getByText("אהבה, יופי ויצירה")).toBeTruthy();
  });

  it("runs a parent-child reading against a person typed in by hand", async () => {
    await setup(async (s) => { await s.clients.create(SHANI); });
    await openClient("שני כהן אזולאי");
    await tap("בדיקה חדשה");
    await tapTab("הורה-ילד");
    fireEvent.change(await screen.findByLabelText("שם האדם השני"), { target: { value: "נועה כהן" } });
    fireEvent.change(screen.getByLabelText("תאריך הלידה של האדם השני"), { target: { value: "07.03.2015" } });
    click("חשב ושמור");
    expect(await screen.findByText("55%")).toBeTruthy();
  });

  it("keeps session notes and a follow-up date, and lists the follow-up on the home screen when due", async () => {
    await setup(async (s) => {
      const c = await s.clients.create(SHANI);
      await s.readings.create({ clientId: c.id, type: "yearCycle", input: { birthDate: "1990-08-15", add: false }, result: { proj: [{ year: 2026, py: 6, isCurrent: true }] }, engineVersion: "1.0.0", computedFor: NOW.toISOString() });
    });
    await openClient("שני כהן אזולאי");
    await tap(/שנים אישיות 2026/);
    fireEvent.change(await screen.findByLabelText("סיכום הפגישה"), { target: { value: "דיברנו על השנה האישית" } });
    fireEvent.change(screen.getByLabelText("תאריך מעקב"), { target: { value: "05.10.2026" } });
    click("שמירת סיכום");
    expect(await screen.findByText("נשמר")).toBeTruthy();
    click("חזרה לתיק");
    await tap("חזרה ללקוחות");
    const followUps = await screen.findByTestId("follow-ups");
    expect(within(followUps).getByText(/שני כהן אזולאי/)).toBeTruthy();
  });

  it("searches the list", async () => {
    await setup(async (s) => {
      await s.clients.create({ fullName: "רחל לוי", birthDate: "1992-02-29" });
      await s.clients.create({ fullName: "משה כהן" });
    });
    expect(await screen.findByRole("button", { name: /משה כהן/ })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("חיפוש לפי שם, טלפון או תגית"), { target: { value: "לוי" } });
    await waitFor(() => expect(screen.queryByRole("button", { name: /משה כהן/ })).toBeNull());
    expect(screen.getByRole("button", { name: /רחל לוי/ })).toBeTruthy();
  });

  it("attaches a file to the client and deletes it", async () => {
    const store = await setup(async (s) => { await s.clients.create(SHANI); });
    await openClient("שני כהן אזולאי");
    const input = await screen.findByLabelText("הוספת קובץ");
    fireEvent.change(input, { target: { files: [new File(["hello"], "notes.txt", { type: "text/plain" })] } });
    expect(await screen.findByText("notes.txt")).toBeTruthy();
    const [client] = await store.clients.list();
    expect(await store.attachments.listByClient(client.id)).toHaveLength(1);
    click("מחיקת notes.txt");
    await waitFor(() => expect(screen.queryByText("notes.txt")).toBeNull());
  });

  it("deletes a client after a confirmation", async () => {
    const store = await setup(async (s) => { await s.clients.create(SHANI); });
    await openClient("שני כהן אזולאי");
    await tap("עריכה");
    await tap("מחיקת הלקוח");
    click("כן, למחוק הכל");
    expect(await screen.findByText(/עוד אין לקוחות/)).toBeTruthy();
    expect(await store.clients.list()).toEqual([]);
  });

  it("backs up to a file and restores it into an empty workspace", async () => {
    let blob;
    URL.createObjectURL = (b) => { blob = b; return "blob:backup"; };
    URL.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await setup(async (s) => { await s.clients.create(SHANI); });
    await screen.findByRole("button", { name: /שני כהן אזולאי/ });
    click("גיבוי");
    await waitFor(() => expect(blob).toBeTruthy());
    const json = await readText(blob);
    expect(JSON.parse(json)).toMatchObject({ format: "numerology-workspace-backup", clients: [{ fullName: "שני כהן אזולאי" }] });

    cleanup();
    await setup();
    expect(await screen.findByText(/עוד אין לקוחות/)).toBeTruthy();
    const restore = screen.getByLabelText("שחזור מגיבוי");
    fireEvent.change(restore, { target: { files: [new File([json], "backup.json", { type: "application/json" })] } });
    expect(await screen.findByText("שוחזרו: לקוח אחד, 0 בדיקות, 0 קבצים")).toBeTruthy();
    expect(await screen.findByRole("button", { name: /שני כהן אזולאי/ })).toBeTruthy();
  });

  it("warns when this browser does not keep the data", async () => {
    await setup();
    expect(await screen.findByText(/הנתונים לא נשמרים בדפדפן הזה/)).toBeTruthy();
  });
});

function readText(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(blob);
  });
}
