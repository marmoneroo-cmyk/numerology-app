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
import { LIMITS } from "../../data/validation.js";
import { fullCalc, getRecommendations, matchReading } from "../../engine/index.js";
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

/** Renders the workspace over a fresh in-memory store; `seed(store, backend)` fills it first. */
async function setup(seed, { he = true, content = CONTENT } = {}) {
  let n = 0;
  let t = NOW.getTime();
  const backend = memoryBackend();
  const store = createStore(backend, { now: () => new Date((t += 1000)), newId: () => `id-${++n}` });
  if (seed) await seed(store, backend);
  render(
    <ContentContext.Provider value={content}>
      <WorkspaceApp he={he} dk store={store} now={() => NOW} />
    </ContentContext.Provider>,
  );
  return store;
}
const SHANI = { fullName: "שני כהן אזולאי", birthDate: "1990-08-15" };
const AVIR = { fullName: "אביר אזולאי", birthDate: "1987-11-03" };
const yearReadingOf = (clientId, over = {}) => ({
  clientId, type: "yearCycle", input: { birthDate: "1990-08-15", add: false }, result: { proj: [{ year: 2026, py: 6, isCurrent: true }] },
  engineVersion: "1.0.0", computedFor: NOW.toISOString(), ...over,
});
const click = (name) => fireEvent.click(screen.getByRole("button", { name }));
const tap = async (name) => fireEvent.click(await screen.findByRole("button", { name }));
const tapTab = async (name) => fireEvent.click(await screen.findByRole("tab", { name }));
const openClient = (name) => tap(new RegExp(name));
/** jsdom has no object URLs or downloads: capture what would be saved. */
function captureDownloads() {
  const saved = [];
  URL.createObjectURL = (b) => {
    saved.push(b);
    return "blob:test";
  };
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return saved;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete URL.createObjectURL;
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

  it("works in English too", async () => {
    await setup(null, { he: false });
    expect(await screen.findByText(/No clients yet/)).toBeTruthy();
    click("New client");
    fireEvent.change(await screen.findByLabelText("Full name"), { target: { value: "Shani Cohen" } });
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "15.08.1990" } });
    click("Save");
    expect(await screen.findByRole("heading", { name: "Shani Cohen" })).toBeTruthy();
    expect(screen.getByText(/age 36/)).toBeTruthy();
  });

  it("moves focus to the title of each new screen", async () => {
    await setup(async (s) => {
      await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    const heading = await screen.findByRole("heading", { name: "שני כהן אזולאי" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("shows Hebrew validation messages next to the fields and keeps the form open", async () => {
    await setup();
    await tap("לקוח חדש");
    fireEvent.change(await screen.findByLabelText("תאריך לידה"), { target: { value: "31.02.1990" } });
    fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "nope" } });
    click("שמירה");
    expect(await screen.findByText("חובה למלא שם")).toBeTruthy();
    expect(screen.getByText("תאריך לא תקין (dd.mm.yyyy)")).toBeTruthy();
    expect(screen.getByText("כתובת מייל לא תקינה")).toBeTruthy();
    const name = screen.getByLabelText("שם מלא");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(name.getAttribute("aria-describedby")).textContent).toBe("חובה למלא שם");
  });

  it("edits a client's details", async () => {
    await setup(async (s) => {
      await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    await tap("עריכה");
    fireEvent.change(await screen.findByLabelText("טלפון"), { target: { value: "052-1234567" } });
    click("שמירה");
    expect(await screen.findByText("052-1234567")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "שני כהן אזולאי" })).toBeTruthy();
  });

  it("saves a full map reading, with its insights, and shows it from the stored snapshot", async () => {
    let client;
    const store = await setup(async (s) => {
      client = await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    await tap("בדיקה חדשה");
    await tap("חשב ושמור");
    expect(await screen.findByText("גרסת מנוע 1.0.0")).toBeTruthy();
    expect(screen.getByTestId("num-lp").textContent).toContain("33");
    expect(screen.getByTestId("num-py").textContent).toContain("6");
    const [saved] = await store.readings.listByClient(client.id);
    expect(saved).toMatchObject({ type: "map", engineVersion: "1.0.0", computedFor: NOW.toISOString(), result: { lp: 33, nv: 4, py: 6 } });
    const calc = fullCalc(15, 8, 1990, SHANI.fullName, false, NOW);
    expect(saved.result.insights).toEqual({ he: getRecommendations(calc, "he"), en: getRecommendations(calc, "en") });
    click("חזרה לתיק");
    expect(await screen.findByText("שביל הגורל 33 · ערך השם 4 · שנה אישית 6")).toBeTruthy();
  });

  it("shows the insights saved with a map, not a fresh calculation", async () => {
    await setup(async (s) => {
      const c = await s.clients.create(SHANI);
      const calc = fullCalc(15, 8, 1990, SHANI.fullName, false, NOW);
      const saved = [{ icon: "✨", t: "תובנה שנשמרה", d: "נשמרה יחד עם הבדיקה" }];
      await s.readings.create({ clientId: c.id, type: "map", input: { name: SHANI.fullName, birthDate: SHANI.birthDate, add: false }, result: { ...calc, insights: { he: saved, en: saved } }, engineVersion: "1.0.0", computedFor: NOW.toISOString() });
    });
    await openClient("שני כהן אזולאי");
    await tap(/שביל הגורל 33/);
    expect(await screen.findByText("תובנה שנשמרה")).toBeTruthy();
  });

  it("shows a saved map in meeting mode, from its stored snapshot, when the Studio offers it", async () => {
    const openMeeting = vi.fn();
    await setup(
      async (s) => {
        const c = await s.clients.create(SHANI);
        const calc = fullCalc(15, 8, 1990, SHANI.fullName, false, NOW);
        await s.readings.create({ clientId: c.id, type: "map", input: { name: SHANI.fullName, birthDate: SHANI.birthDate, add: false }, result: { ...calc, insights: { he: [], en: [] } }, engineVersion: "1.0.0", computedFor: NOW.toISOString() });
      },
      { content: { ...CONTENT, openMeeting } },
    );
    await openClient("שני כהן אזולאי");
    await tap(/שביל הגורל 33/);
    await tap("מצב פגישה");
    expect(openMeeting).toHaveBeenCalledTimes(1);
    expect(openMeeting.mock.calls[0][0]).toMatchObject({ lp: 33, nv: 4, py: 6 });
    expect(openMeeting.mock.calls[0][1]).toBe(SHANI.fullName);
  });

  it("offers no meeting mode where the app has none", async () => {
    await setup(async (s) => {
      const c = await s.clients.create(SHANI);
      const calc = fullCalc(15, 8, 1990, SHANI.fullName, false, NOW);
      await s.readings.create({ clientId: c.id, type: "map", input: { name: SHANI.fullName, birthDate: SHANI.birthDate, add: false }, result: { ...calc, insights: { he: [], en: [] } }, engineVersion: "1.0.0", computedFor: NOW.toISOString() });
    });
    await openClient("שני כהן אזולאי");
    await tap(/שביל הגורל 33/);
    expect(await screen.findByText("גרסת מנוע 1.0.0")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "מצב פגישה" })).toBeNull();
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
    await setup(async (s) => {
      await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    await tap("בדיקה חדשה");
    await tapTab("הורה-ילד");
    fireEvent.change(await screen.findByLabelText("שם האדם השני"), { target: { value: "נועה כהן" } });
    fireEvent.change(screen.getByLabelText("תאריך הלידה של האדם השני"), { target: { value: "07.03.2015" } });
    click("חשב ושמור");
    expect(await screen.findByText("55%")).toBeTruthy();
  });

  it("shows a deleted client as (נמחק) in the readings that mention them", async () => {
    await setup(async (s) => {
      const avir = await s.clients.create(AVIR);
      const shani = await s.clients.create(SHANI);
      const result = matchReading(personOf(SHANI.fullName, SHANI.birthDate), personOf(AVIR.fullName, AVIR.birthDate), "love");
      await s.readings.create({
        clientId: shani.id, type: "match", result, engineVersion: "1.0.0", computedFor: NOW.toISOString(),
        input: { person: { name: SHANI.fullName, birthDate: SHANI.birthDate }, other: { clientId: avir.id, name: AVIR.fullName, birthDate: AVIR.birthDate }, matchType: "love" },
      });
      await s.clients.remove(avir.id);
    });
    await openClient("שני כהן אזולאי");
    await tap(/התאמה זוגית עם \(נמחק\)/);
    expect(await screen.findByRole("columnheader", { name: "(נמחק)" })).toBeTruthy();
    expect(screen.queryByText(/אביר/)).toBeNull();
  });

  it("keeps session notes and a follow-up date, and lists the follow-up on the home screen when due", async () => {
    await setup(async (s) => {
      const c = await s.clients.create(SHANI);
      await s.readings.create(yearReadingOf(c.id));
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

  it("saves the summary when going back without pressing save", async () => {
    const store = await setup(async (s) => {
      const c = await s.clients.create(SHANI);
      await s.readings.create(yearReadingOf(c.id));
    });
    await openClient("שני כהן אזולאי");
    await tap(/שנים אישיות 2026/);
    fireEvent.change(await screen.findByLabelText("סיכום הפגישה"), { target: { value: "סיכום שלא נשמר ידנית" } });
    click("חזרה לתיק");
    expect(await screen.findByText("יש סיכום")).toBeTruthy();
    const [r] = await store.readings.listRecent();
    expect(r.notes).toBe("סיכום שלא נשמר ידנית");
  });

  it("stays on the reading when the summary cannot be saved on the way back", async () => {
    await setup(async (s) => {
      const c = await s.clients.create(SHANI);
      await s.readings.create(yearReadingOf(c.id));
    });
    await openClient("שני כהן אזולאי");
    await tap(/שנים אישיות 2026/);
    fireEvent.change(await screen.findByLabelText("תאריך מעקב"), { target: { value: "31.02.2026" } });
    click("חזרה לתיק");
    expect(await screen.findByText("תאריך מעקב לא תקין")).toBeTruthy();
    expect(screen.getByLabelText("סיכום הפגישה")).toBeTruthy();
  });

  it("marks due follow-ups as done from the home screen, keeping the keyboard focus in place", async () => {
    const store = await setup(async (s) => {
      const shani = await s.clients.create(SHANI);
      const avir = await s.clients.create(AVIR);
      await s.readings.create(yearReadingOf(shani.id, { followUp: "2026-10-01" }));
      await s.readings.create(yearReadingOf(avir.id, { followUp: "2026-10-02", input: { birthDate: AVIR.birthDate, add: false } }));
    });
    const doneShani = "סימון המעקב של שני כהן אזולאי כבוצע";
    const doneAvir = "סימון המעקב של אביר אזולאי כבוצע";
    fireEvent.click(within(await screen.findByTestId("follow-ups")).getByRole("button", { name: doneShani }));
    await waitFor(() => expect(screen.queryByRole("button", { name: doneShani })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: doneAvir })));
    click(doneAvir);
    await waitFor(() => expect(screen.queryByTestId("follow-ups")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("חיפוש לקוחות")));
    expect((await store.readings.listRecent()).map((r) => r.followUp)).toEqual([null, null]);
  });

  it("deletes a saved reading after a confirmation and keeps the client", async () => {
    const store = await setup(async (s) => {
      const c = await s.clients.create(SHANI);
      await s.readings.create(yearReadingOf(c.id));
    });
    await openClient("שני כהן אזולאי");
    await tap(/שנים אישיות 2026/);
    await tap("מחיקת הבדיקה");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "השארה" })));
    click("כן, למחוק");
    expect(await screen.findByText("עוד אין בדיקות שמורות ללקוח הזה.")).toBeTruthy();
    expect(await store.readings.listRecent()).toEqual([]);
    expect(await store.clients.list()).toHaveLength(1);
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

  it("attaches a file, hands it back as a plain download, and deletes it only after a confirmation", async () => {
    const downloads = captureDownloads();
    const store = await setup(async (s) => {
      await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    const input = await screen.findByLabelText("הוספת קובץ");
    fireEvent.change(input, { target: { files: [new File(["<script>alert(1)</script>"], "page.html", { type: "text/html" })] } });
    expect(await screen.findByText("page.html")).toBeTruthy();
    click("פתיחת page.html");
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].type).toBe("application/octet-stream");
    click("מחיקת page.html");
    expect(screen.getByText("page.html")).toBeTruthy();
    // the focus follows the question and comes back when the file is kept
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "השארה" })));
    click("השארה");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "מחיקת page.html" })));
    click("מחיקת page.html");
    click("כן, למחוק את page.html");
    await waitFor(() => expect(screen.queryByText("page.html")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("הוספת קובץ")));
    const [client] = await store.clients.list();
    expect(await store.attachments.listByClient(client.id)).toEqual([]);
  });

  it("refuses a file over 20 MB without reading it", async () => {
    await setup(async (s) => {
      await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    const big = new File(["x"], "big.mov", { type: "video/quicktime" });
    Object.defineProperty(big, "size", { value: LIMITS.attachmentBytes + 1 });
    big.arrayBuffer = vi.fn();
    fireEvent.change(await screen.findByLabelText("הוספת קובץ"), { target: { files: [big] } });
    expect(await screen.findByText("big.mov: הקובץ גדול מ-20MB")).toBeTruthy();
    expect(big.arrayBuffer).not.toHaveBeenCalled();
  });

  it("deletes a client after a confirmation", async () => {
    const store = await setup(async (s) => {
      await s.clients.create(SHANI);
    });
    await openClient("שני כהן אזולאי");
    await tap("עריכה");
    await tap("מחיקת הלקוח");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "השארה" })));
    click("כן, למחוק הכל");
    expect(await screen.findByText(/עוד אין לקוחות/)).toBeTruthy();
    expect(await store.clients.list()).toEqual([]);
  });

  it("backs up to a file and restores it into an empty workspace", async () => {
    const downloads = captureDownloads();
    await setup(async (s) => {
      await s.clients.create(SHANI);
    });
    await screen.findByRole("button", { name: /שני כהן אזולאי/ });
    click("גיבוי");
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(await screen.findByText(/שמרו אותו במקום מוגן/)).toBeTruthy();
    const json = await readText(downloads[0]);
    expect(JSON.parse(json)).toMatchObject({ format: "numerology-workspace-backup", clients: [{ fullName: "שני כהן אזולאי" }] });

    cleanup();
    await setup();
    expect(await screen.findByText(/עוד אין לקוחות/)).toBeTruthy();
    const restore = screen.getByLabelText("שחזור מגיבוי");
    fireEvent.change(restore, { target: { files: [new File([json], "backup.json", { type: "application/json" })] } });
    expect(await screen.findByText("שוחזרו: לקוח אחד, 0 בדיקות, 0 קבצים")).toBeTruthy();
    expect(await screen.findByRole("button", { name: /שני כהן אזולאי/ })).toBeTruthy();
  });

  it("remembers a backup's date for the reminder, except in the demo, where the date is the real subscriber's", async () => {
    captureDownloads();
    const KEY = "numerology_workspace_last_backup";
    localStorage.removeItem(KEY);
    const store = createStore(memoryBackend(), { now: () => NOW, newId: () => "id-1" });
    await store.clients.create(SHANI);
    const { unmount } = render(<ContentContext.Provider value={CONTENT}><WorkspaceApp he dk store={store} now={() => NOW} remembersBackups={false} /></ContentContext.Provider>);
    await screen.findByRole("button", { name: /שני כהן אזולאי/ });
    click("גיבוי");
    await screen.findByText(/הגיבוי נשמר|נשמר/);
    expect(localStorage.getItem(KEY)).toBeNull();
    unmount();
    render(<ContentContext.Provider value={CONTENT}><WorkspaceApp he dk store={store} now={() => NOW} /></ContentContext.Provider>);
    await screen.findByRole("button", { name: /שני כהן אזולאי/ });
    click("גיבוי");
    await waitFor(() => expect(localStorage.getItem(KEY)).toBe(NOW.toISOString()));
  });

  it("reports backups and restores, for the account's log", async () => {
    captureDownloads();
    const onEvent = vi.fn();
    let n = 0;
    const store = createStore(memoryBackend(), { now: () => NOW, newId: () => `id-${++n}` });
    await store.clients.create(SHANI);
    render(<ContentContext.Provider value={CONTENT}><WorkspaceApp he dk store={store} now={() => NOW} onEvent={onEvent} /></ContentContext.Provider>);
    await screen.findByRole("button", { name: /שני כהן אזולאי/ });
    click("גיבוי");
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith("backup_exported"));
    const backup = JSON.stringify(await store.exportAll());
    fireEvent.change(screen.getByLabelText("שחזור מגיבוי"), { target: { files: [new File([backup], "b.json", { type: "application/json" })] } });
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith("backup_restored"));
  });

  it("says when a backup had to leave out files whose contents are gone", async () => {
    const downloads = captureDownloads();
    await setup(async (s, backend) => {
      const c = await s.clients.create(SHANI);
      const a = await s.attachments.add({ clientId: c.id, name: "map.pdf", type: "application/pdf", bytes: new Uint8Array([1, 2]) });
      await backend.deleteBlob(a.id);
    });
    await screen.findByRole("button", { name: /שני כהן אזולאי/ });
    click("גיבוי");
    expect(await screen.findByText(/קובץ אחד לא נכלל בגיבוי כי התוכן שלו חסר במכשיר/)).toBeTruthy();
    expect(downloads).toHaveLength(1);
  });

  it("explains why a restore did not happen, and changes nothing", async () => {
    const store = await setup();
    await screen.findByText(/עוד אין לקוחות/);
    const pick = (text) => fireEvent.change(screen.getByLabelText("שחזור מגיבוי"), { target: { files: [new File([text], "backup.json", { type: "application/json" })] } });
    pick("not json at all");
    expect(await screen.findByText(/לא ניתן לקרוא את הקובץ/)).toBeTruthy();
    pick(JSON.stringify({ hello: 1 }));
    expect(await screen.findByText("הקובץ הזה אינו גיבוי של מרחב העבודה.")).toBeTruthy();
    const stamp = NOW.toISOString();
    pick(JSON.stringify({ format: "numerology-workspace-backup", version: 1, readings: [], attachments: [], clients: [{ id: "c1", fullName: "", createdAt: stamp, updatedAt: stamp }] }));
    expect(await screen.findByText("הגיבוי פגום ולכן לא שוחזר ממנו דבר (שגיאה אחת).")).toBeTruthy();
    expect(await store.clients.list({ includeArchived: true })).toEqual([]);
  });

  it("shows a calm error instead of crashing when a saved reading is damaged", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // React reports the caught error
    await setup(async (s, backend) => {
      const c = await s.clients.create(SHANI);
      // written straight to the device, past the store's checks, as an old or hand-edited database could be
      await backend.put("readings", { ...yearReadingOf(c.id), id: "broken", result: { proj: "x" }, title: "", notes: "", followUp: null, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() });
    });
    await openClient("שני כהן אזולאי");
    await tap(/לא ניתן להציג את הסיכום/);
    expect(await screen.findByText(/משהו השתבש בהצגת המסך הזה/)).toBeTruthy();
    click("חזרה ללקוחות");
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
