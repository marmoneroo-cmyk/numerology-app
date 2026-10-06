// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import Today from "../Today.jsx";
import { createStore } from "../../data/store.js";
import { memoryBackend } from "../../data/memoryBackend.js";

// Tuesday 6 October 2026, morning
const NOW = new Date(2026, 9, 6, 9, 30);
const DAY = { number: 8, title: "עוצמה", text: "הישגים, שפע וסמכות." };
const DATE_FORMAT = { weekday: "long", day: "numeric", month: "long", year: "numeric" };

const RACHEL = { fullName: "רחל כהן", birthDate: "1985-10-07", phone: "052-1234567" }; // tomorrow, turning 41
const YOSSI = { fullName: "יוסי לוי", birthDate: "1990-10-06" }; // today, no phone
const MICHAL = { fullName: "מיכל אברהם", birthDate: "1978-10-11", phone: "+44 20 7946 0958" }; // in 5 days
const DANA = { fullName: "דנה שמיר", birthDate: "1992-03-03", phone: "050-7654321" }; // not this week
const URI = { fullName: "אורי בן דוד", birthDate: "1987-10-08", phone: "053-1112233", archived: true };
const NOA = { fullName: "נועה ברק", phone: "054-9998877" }; // no birth date
const ALL = [RACHEL, YOSSI, MICHAL, DANA, URI, NOA]; // ids id-1 to id-6, NOA the most recent

const EMPTY_HE = "עוד אין לקוחות. מוסיפים את הראשון ב׳לקוח חדש׳.";
const FAILED_HE = "לא הצלחנו לטעון את הלקוחות.";

/** An in-memory store holding `clients`, created in order a minute apart, so the last is the most recent. */
async function storeWith(clients) {
  let n = 0;
  let t = NOW.getTime() - 24 * 60 * 60 * 1000;
  const store = createStore(memoryBackend(), { now: () => new Date((t += 60 * 1000)), newId: () => `id-${++n}` });
  for (const c of clients) await store.clients.create(c);
  return store;
}

/** The same store, except that its first list call fails. */
function failingOnce(store) {
  let calls = 0;
  const list = (...args) => (++calls === 1 ? Promise.reject(new Error("offline")) : store.clients.list(...args));
  return { store: { ...store, clients: { ...store.clients, list } }, calls: () => calls };
}

/** Renders Today over `store`; the life path is the last digit of the date, every personal year is 5. */
function renderToday(store, props = {}) {
  const handlers = { onOpenClient: vi.fn(), onNewReading: vi.fn(), onNewClient: vi.fn(), onMeeting: vi.fn(), onSearch: vi.fn() };
  const personalYear = vi.fn(() => 5);
  render(
    <Today
      he
      store={store}
      now={() => NOW}
      day={DAY}
      lifePath={(iso) => Number(iso.slice(-1))}
      personalYear={personalYear}
      deck={<div>החפיסה כאן</div>}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, personalYear };
}

/** The panel under this title. */
const panel = (title) => screen.getByRole("heading", { name: title }).closest("section");
const nameIn = (el) => el.querySelector(".st-today-name").textContent;

afterEach(() => {
  cleanup();
});

describe("Today", () => {
  it("shows today's number, the date and the day's meaning, and starts a new reading", async () => {
    const h = renderToday(await storeWith([]));
    expect(screen.getByText("8").className).toContain("st-today-num");
    expect(screen.getByText("יום אוניברסלי")).toBeTruthy();
    expect(screen.getByText(NOW.toLocaleDateString("he-IL", DATE_FORMAT))).toBeTruthy();
    expect(document.querySelector(".st-today-meaning").textContent).toBe("עוצמה. הישגים, שפע וסמכות.");
    fireEvent.click(screen.getByRole("button", { name: "קריאה חדשה" }));
    expect(h.onNewReading).toHaveBeenCalledTimes(1);
    expect(h.onNewReading).toHaveBeenCalledWith();
    await screen.findAllByText(EMPTY_HE);
  });

  it("lists this week's birthdays, soonest first, with the age and numbers, and a greeting only where there is a phone", async () => {
    const h = renderToday(await storeWith(ALL));
    const rows = await within(panel("ימי הולדת השבוע")).findAllByRole("listitem");
    expect(rows.map(nameIn)).toEqual(["יוסי לוי", "רחל כהן", "מיכל אברהם"]);

    const [yossi, rachel, michal] = rows;
    expect(within(yossi).getByText("היום · 6.10 · יום הולדת 36")).toBeTruthy();
    expect(within(yossi).getByText("מסלול 6")).toBeTruthy();
    expect(within(yossi).queryByRole("link")).toBeNull();

    expect(within(rachel).getByText("מחר · 7.10 · יום הולדת 41")).toBeTruthy();
    expect(within(rachel).getByText("מסלול 7")).toBeTruthy();
    expect(within(rachel).getByText("שנה אישית 5")).toBeTruthy();
    const greeting = within(rachel).getByRole("link", { name: "ברכה לרחל כהן" });
    const text = encodeURIComponent("יום הולדת שמח, רחל! מאחלים לך שנה של אור, צמיחה והגשמה.");
    expect(greeting.getAttribute("href")).toBe(`https://wa.me/972521234567?text=${text}`);
    expect(greeting.getAttribute("target")).toBe("_blank");
    expect(greeting.getAttribute("rel")).toBe("noopener noreferrer");
    // the personal year is the one the client enters on the birthday
    expect(h.personalYear).toHaveBeenCalledWith("1985-10-07", new Date(2026, 9, 7));

    expect(within(michal).getByText("בעוד 5 ימים · 11.10 · יום הולדת 48")).toBeTruthy();
    expect(within(michal).getByRole("link", { name: /ברכה/ }).getAttribute("href")).toMatch(/^https:[/][/]wa[.]me[/]442079460958[?]text=/);
  });

  it("lists the four most recently active clients, and opens one", async () => {
    const h = renderToday(await storeWith(ALL));
    const buttons = await within(panel("לקוחות אחרונים")).findAllByRole("button");
    expect(buttons.map(nameIn)).toEqual(["נועה ברק", "דנה שמיר", "מיכל אברהם", "יוסי לוי"]);
    expect(buttons[0].textContent).not.toContain("מסלול");
    expect(buttons[1].textContent).toContain("מסלול 3");
    fireEvent.click(buttons[1]);
    expect(h.onOpenClient).toHaveBeenCalledWith("id-4");
  });

  it("offers quick actions", async () => {
    const h = renderToday(await storeWith([]));
    const actions = panel("פעולות מהירות");
    fireEvent.click(within(actions).getByRole("button", { name: "לקוח חדש" }));
    fireEvent.click(within(actions).getByRole("button", { name: "מצב פגישה" }));
    const search = within(actions).getByRole("button", { name: "חיפוש מהיר" });
    expect(search.textContent).toContain("Ctrl K");
    expect(search.getAttribute("aria-keyshortcuts")).toContain("Control+K");
    fireEvent.click(search);
    expect([h.onNewClient, h.onMeeting, h.onSearch].map((fn) => fn.mock.calls)).toEqual([[[]], [[]], [[]]]);
    await screen.findAllByText(EMPTY_HE);
  });

  it("leaves out a quick action the app has not wired", async () => {
    renderToday(await storeWith([]), { onMeeting: undefined });
    const actions = panel("פעולות מהירות");
    expect(within(actions).queryByRole("button", { name: "מצב פגישה" })).toBeNull();
    expect(within(actions).getAllByRole("button")).toHaveLength(2);
    await screen.findAllByText(EMPTY_HE);
  });

  it("shows today's card under the panels", async () => {
    renderToday(await storeWith([]));
    expect(within(panel("קלף היום")).getByText("החפיסה כאן")).toBeTruthy();
    await screen.findAllByText(EMPTY_HE);
  });

  it("says how to add the first client when there are none", async () => {
    renderToday(await storeWith([]));
    expect(await screen.findAllByText(EMPTY_HE)).toHaveLength(2);
    expect(screen.queryByText("אין ימי הולדת השבוע.")).toBeNull();
  });

  it("says when no birthday falls this week", async () => {
    renderToday(await storeWith([DANA]));
    expect(await within(panel("ימי הולדת השבוע")).findByText("אין ימי הולדת השבוע.")).toBeTruthy();
    expect(within(panel("לקוחות אחרונים")).getByRole("button", { name: /דנה שמיר/ })).toBeTruthy();
  });

  it("shows a quiet loading line in the panels until the clients arrive", async () => {
    renderToday(await storeWith([RACHEL]));
    expect(screen.getAllByText("טוענים…")).toHaveLength(2);
    expect(await within(panel("לקוחות אחרונים")).findByRole("button", { name: /רחל כהן/ })).toBeTruthy();
    expect(screen.queryByText("טוענים…")).toBeNull();
  });

  it("explains a failed load in both panels, announces it once, and tries again", async () => {
    const flaky = failingOnce(await storeWith([RACHEL]));
    renderToday(flaky.store);
    const alert = await screen.findByRole("alert");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(alert.textContent).toBe(FAILED_HE);
    expect(within(panel("ימי הולדת השבוע")).getByRole("alert")).toBe(alert);
    const recent = panel("לקוחות אחרונים");
    expect(within(recent).getByText(FAILED_HE)).toBeTruthy();
    expect(within(recent).queryByRole("alert")).toBeNull();
    expect(screen.getAllByRole("button", { name: "לנסות שוב" })).toHaveLength(2);
    const retry = within(recent).getByRole("button", { name: "לנסות שוב" });
    retry.focus();
    fireEvent.click(retry);
    expect(await within(panel("לקוחות אחרונים")).findByRole("button", { name: /רחל כהן/ })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(flaky.calls()).toBe(2);
    // the retry button is gone, so the focus goes to the first panel's title rather than dropping to the page
    const title = screen.getByRole("heading", { name: "ימי הולדת השבוע" });
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(title);
  });

  it("leaves the focus where it was moved while the retry was loading", async () => {
    const flaky = failingOnce(await storeWith([RACHEL]));
    renderToday(flaky.store);
    const retry = (await screen.findAllByRole("button", { name: "לנסות שוב" }))[0];
    const elsewhere = document.body.appendChild(document.createElement("button"));
    retry.focus();
    fireEvent.click(retry);
    elsewhere.focus();
    expect(await within(panel("לקוחות אחרונים")).findByRole("button", { name: /רחל כהן/ })).toBeTruthy();
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it("says the day after tomorrow as יומיים", async () => {
    const SHIRA = { fullName: "שירה גל", birthDate: "1991-10-08" };
    renderToday(await storeWith([SHIRA]));
    expect(await screen.findByText("בעוד יומיים · 8.10 · יום הולדת 35")).toBeTruthy();
    cleanup();
    renderToday(await storeWith([SHIRA]), { he: false });
    expect(await screen.findByText("In 2 days · 8.10 · Turning 35")).toBeTruthy();
  });

  it("speaks English", async () => {
    const h = renderToday(await storeWith(ALL), { he: false });
    expect(screen.getByText("Universal day")).toBeTruthy();
    expect(screen.getByText(NOW.toLocaleDateString("en-GB", DATE_FORMAT))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "New reading" }));
    expect(h.onNewReading).toHaveBeenCalledTimes(1);

    const [yossi, rachel, michal] = await within(panel("Birthdays this week")).findAllByRole("listitem");
    expect(within(yossi).getByText("Today · 6.10 · Turning 36")).toBeTruthy();
    expect(within(rachel).getByText("Tomorrow · 7.10 · Turning 41")).toBeTruthy();
    expect(within(rachel).getByText("Life path 7")).toBeTruthy();
    expect(within(rachel).getByText("Personal year 5")).toBeTruthy();
    const greeting = within(rachel).getByRole("link", { name: "Greeting for רחל כהן" });
    const text = encodeURIComponent("Happy birthday, רחל! Wishing you a year of light, growth and fulfilment.");
    expect(greeting.getAttribute("href")).toBe(`https://wa.me/972521234567?text=${text}`);
    expect(within(michal).getByText("In 5 days · 11.10 · Turning 48")).toBeTruthy();

    expect(within(panel("Recent clients")).getByRole("button", { name: /דנה שמיר.*Life path 3/ })).toBeTruthy();
    const actions = panel("Quick actions");
    for (const name of ["New client", "Meeting mode", "Quick search"]) expect(within(actions).getByRole("button", { name })).toBeTruthy();
    expect(within(panel("Today's card")).getByText("החפיסה כאן")).toBeTruthy();
  });

  it("speaks English while loading, after a failure, and with no clients or birthdays", async () => {
    const flaky = failingOnce(await storeWith([]));
    renderToday(flaky.store, { he: false });
    expect(screen.getAllByText("Loading…")).toHaveLength(2);
    expect((await screen.findByRole("alert")).textContent).toBe("The clients could not be loaded.");
    expect(screen.getAllByText("The clients could not be loaded.")).toHaveLength(2);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Try again" })[0]);
    expect(await screen.findAllByText("No clients yet. Add the first one with New client.")).toHaveLength(2);
    cleanup();
    renderToday(await storeWith([DANA]), { he: false });
    expect(await screen.findByText("No birthdays this week.")).toBeTruthy();
  });
});
