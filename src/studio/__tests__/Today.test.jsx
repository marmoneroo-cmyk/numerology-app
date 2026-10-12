// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";
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

// every personal year is 5 in these tests (see renderToday)
const RACHEL_GREETING_HE = "יום הולדת שמח, רחל!\nבנומרולוגיה, זו שנה אישית 5 — שנה של שינוי, חופש והרפתקאות.\nמאחלים שנה מלאה באור ובהגשמה.";
const RACHEL_GREETING_EN = "Happy birthday, רחל!\nIn numerology, your personal year is 5 — a year of change, freedom and adventure.\nWishing you a year full of light and fulfilment.";

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
  const handlers = { onOpenClient: vi.fn(), onNewReading: vi.fn(), onNewClient: vi.fn(), onMeeting: vi.fn(), onSearch: vi.fn(), onOpenReading: vi.fn() };
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
  it("shows the universal day, the date and the day's meaning, and starts a new reading", async () => {
    const h = renderToday(await storeWith([]));
    expect(screen.getByRole("heading", { name: "האנרגיה של היום" })).toBeTruthy();
    // the day's number is in the middle of the wheel (the wheel's ring has an 8 of its own)
    expect(document.querySelector(".st-wheel .st-today-num").textContent).toBe("8");
    expect(screen.getByText("היום האוניברסלי")).toBeTruthy();
    expect(screen.getByText(NOW.toLocaleDateString("he-IL", DATE_FORMAT))).toBeTruthy();
    expect(document.querySelector(".st-today-meaning").textContent).toBe("עוצמה. הישגים, שפע וסמכות.");
    fireEvent.click(screen.getByRole("button", { name: "קריאה חדשה" }));
    expect(h.onNewReading).toHaveBeenCalledTimes(1);
    expect(h.onNewReading).toHaveBeenCalledWith();
    await screen.findAllByText(EMPTY_HE);
  });

  it("in the demo, opens the greeting with no one chosen: the sample numbers may be someone's real ones", async () => {
    renderToday(await storeWith(ALL), { greetAnyone: true });
    const [yossi, rachel] = await within(panel("ימי הולדת השבוע")).findAllByRole("listitem");
    const greeting = within(rachel).getByRole("link", { name: "ברכה לרחל כהן" });
    const text = encodeURIComponent(RACHEL_GREETING_HE);
    expect(greeting.getAttribute("href")).toBe(`https://wa.me/?text=${text}`);
    expect(within(yossi).queryByRole("link")).toBeNull(); // still only where the client has a phone
  });

  describe("bringing clients back", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const ago = (days, from = NOW) => new Date(from.getTime() - days * DAY).toISOString();
    /** A store over plain records: the clients, and the follow-ups due. */
    const fakeStore = (clients, followUps = []) => ({
      clients: { list: async () => clients },
      summary: async () => ({ clients: clients.length, readings: 0, followUps, birthdays: [] }),
    });
    const RACHEL_OLD = { id: "r", fullName: "רחל כהן", birthDate: "1985-03-07", phone: "052-1234567", updatedAt: ago(300), lastActivityAt: ago(300) };
    const YOSSI_NOW = { id: "y", fullName: "יוסי לוי", birthDate: "1990-03-06", updatedAt: ago(2), lastActivityAt: ago(2) };

    it("lists the follow-ups that are due: open the reading, or ask how the client is", async () => {
      const h = renderToday(fakeStore([RACHEL_OLD, YOSSI_NOW], [{ readingId: "rd1", clientId: "r", clientName: "רחל כהן", followUp: "2026-10-01", type: "map" }]));
      const due = await screen.findByRole("heading", { name: "מעקבים שהגיע זמנם" });
      const row = within(due.closest("section")).getByRole("listitem");
      expect(within(row).getByText("מעקב מ-01.10.2026")).toBeTruthy();
      fireEvent.click(within(row).getByRole("button", { name: "לבדיקה של רחל כהן" }));
      expect(h.onOpenReading).toHaveBeenCalledWith("rd1");
      const message = within(row).getByRole("link", { name: "הודעה לרחל כהן" });
      expect(message.getAttribute("href")).toBe(`https://wa.me/972521234567?text=${encodeURIComponent("היי רחל, רציתי לשאול מה נשמע מאז הפגישה שלנו. אם מתאים, אפשר לקבוע פגישת המשך.")}`);
      expect(within(row).queryByRole("button", { name: /בוצע/ })).toBeNull(); // a store that cannot update readings
    });

    describe("marking a follow-up done", () => {
      /** A saved year reading of `clientId` (id-1 is RACHEL, id-2 DANA) whose follow-up date is `followUp`. */
      const dueReading = (clientId, followUp) => ({
        clientId, type: "yearCycle", input: { birthDate: "1985-10-07", add: false }, result: { proj: [{ year: 2026, py: 5, isCurrent: true }] },
        engineVersion: "2.0.0", computedFor: "2026-09-01T09:00:00.000Z", followUp,
      });
      /** The store with RACHEL and DANA, each with a follow-up due; `update` stands in for the readings' update. */
      async function dueStore(update) {
        const store = await storeWith([RACHEL, DANA]);
        await store.readings.create(dueReading("id-1", "2026-10-01"));
        await store.readings.create(dueReading("id-2", "2026-10-02"));
        return update ? { ...store, readings: { ...store.readings, update } } : store;
      }
      const followUps = async () => (await screen.findByRole("heading", { name: "מעקבים שהגיע זמנם" })).closest("section");
      const DONE_RACHEL = "בוצע — המעקב של רחל כהן";
      const DONE_DANA = "בוצע — המעקב של דנה שמיר";

      it("clears the date, drops the row, and moves the focus to the next one, then to the panel's title", async () => {
        const store = await dueStore();
        renderToday(store);
        const panel = await followUps();
        const done = await within(panel).findByRole("button", { name: DONE_RACHEL });
        expect(document.activeElement).toBe(document.body); // loading moves no focus
        fireEvent.click(done);
        await waitFor(() => expect(within(panel).queryByRole("button", { name: DONE_RACHEL })).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole("button", { name: DONE_DANA })));
        fireEvent.click(within(panel).getByRole("button", { name: DONE_DANA }));
        expect(await within(panel).findByText("אין מעקבים שהגיע זמנם.")).toBeTruthy();
        await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole("heading", { name: "מעקבים שהגיע זמנם" })));
        expect((await store.summary(NOW)).followUps).toEqual([]);
        expect((await store.readings.listRecent()).map((r) => r.followUp)).toEqual([null, null]);
      });

      it("leaves the focus where the user has moved it meanwhile", async () => {
        renderToday(await dueStore());
        const panel = await followUps();
        const done = await within(panel).findByRole("button", { name: DONE_RACHEL });
        const elsewhere = screen.getByRole("button", { name: "לקוח חדש" });
        elsewhere.focus(); // pressed done, then went on to another button before the list reloaded
        fireEvent.click(done);
        await waitFor(() => expect(within(panel).queryByRole("button", { name: DONE_RACHEL })).toBeNull());
        expect(within(panel).getByRole("button", { name: DONE_DANA })).toBeTruthy();
        expect(document.activeElement).toBe(elsewhere);
      });

      it("shows the list failing to reload after a follow-up is marked, with the focus on the title and a retry", async () => {
        const store = await dueStore();
        let calls = 0;
        const summary = (...args) => (++calls === 2 ? Promise.reject(new Error("offline")) : store.summary(...args));
        renderToday({ ...store, summary });
        const panel = await followUps();
        fireEvent.click(await within(panel).findByRole("button", { name: DONE_RACHEL }));
        expect((await within(panel).findByRole("alert")).textContent).toBe("לא הצלחנו לטעון את המעקבים.");
        await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole("heading", { name: "מעקבים שהגיע זמנם" })));
        fireEvent.click(within(panel).getByRole("button", { name: "לנסות שוב" }));
        expect(await within(panel).findByRole("button", { name: DONE_DANA })).toBeTruthy();
        expect(within(panel).queryByRole("button", { name: DONE_RACHEL })).toBeNull(); // it was marked
      });

      it("names the client when it could not, keeps the row, and says it again on a second failure", async () => {
        const update = vi.fn(async () => {
          throw new Error("offline");
        });
        renderToday(await dueStore(update));
        const panel = await followUps();
        const done = await within(panel).findByRole("button", { name: DONE_RACHEL });
        fireEvent.click(done);
        const first = await within(panel).findByRole("alert");
        expect(first.textContent).toBe("לא הצלחנו לסמן את המעקב של רחל כהן כבוצע. אפשר לנסות שוב.");
        expect(update).toHaveBeenCalledWith(expect.any(String), { followUp: null });
        fireEvent.click(done);
        await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
        const second = await within(panel).findByRole("alert");
        expect(second).not.toBe(first); // put back, so a screen reader reads it again
        expect(within(panel).getByRole("button", { name: DONE_RACHEL })).toBe(done);
      });

      it("clears the failure once another follow-up is marked done", async () => {
        const store = await dueStore();
        const update = vi.fn((id, patch) => (update.mock.calls.length === 1 ? Promise.reject(new Error("offline")) : store.readings.update(id, patch)));
        renderToday({ ...store, readings: { ...store.readings, update } });
        const panel = await followUps();
        fireEvent.click(await within(panel).findByRole("button", { name: DONE_RACHEL }));
        expect(await within(panel).findByRole("alert")).toBeTruthy();
        fireEvent.click(within(panel).getByRole("button", { name: DONE_DANA }));
        await waitFor(() => expect(within(panel).queryByRole("button", { name: DONE_DANA })).toBeNull());
        expect(within(panel).queryByRole("alert")).toBeNull();
        expect(within(panel).getByRole("button", { name: DONE_RACHEL })).toBeTruthy(); // still due
      });

      it("sends one update for a double press", async () => {
        const store = await dueStore();
        let finish;
        const update = vi.fn((id, patch) => new Promise((resolve) => (finish = () => resolve(store.readings.update(id, patch)))));
        renderToday({ ...store, readings: { ...store.readings, update } });
        const panel = await followUps();
        const done = await within(panel).findByRole("button", { name: DONE_RACHEL });
        fireEvent.click(done);
        fireEvent.click(done);
        expect(update).toHaveBeenCalledTimes(1);
        finish();
        await waitFor(() => expect(within(panel).queryByRole("button", { name: DONE_RACHEL })).toBeNull());
        expect(update).toHaveBeenCalledTimes(1);
      });

      it("drops a follow-up whose reading was deleted meanwhile, with no error", async () => {
        const store = await dueStore();
        renderToday(store);
        const panel = await followUps();
        const done = await within(panel).findByRole("button", { name: DONE_RACHEL });
        const rachels = (await store.readings.listRecent()).find((r) => r.clientId === "id-1");
        await store.readings.remove(rachels.id); // on another device, say
        fireEvent.click(done);
        await waitFor(() => expect(within(panel).queryByRole("button", { name: DONE_RACHEL })).toBeNull());
        expect(within(panel).queryByRole("alert")).toBeNull();
        expect(within(panel).getByRole("button", { name: DONE_DANA })).toBeTruthy();
      });

      it("offers to try again when the follow-ups do not load", async () => {
        const store = await dueStore();
        let calls = 0;
        const summary = (...args) => (++calls === 1 ? Promise.reject(new Error("offline")) : store.summary(...args));
        renderToday({ ...store, summary });
        const panel = await followUps();
        expect((await within(panel).findByRole("alert")).textContent).toBe("לא הצלחנו לטעון את המעקבים.");
        fireEvent.click(within(panel).getByRole("button", { name: "לנסות שוב" }));
        expect(await within(panel).findByRole("button", { name: DONE_RACHEL })).toBeTruthy();
        // the pressed button is gone: the focus goes to the panel's title
        await waitFor(() => expect(document.activeElement).toBe(within(panel).getByRole("heading", { name: "מעקבים שהגיע זמנם" })));
      });

      it("labels the button in English too", async () => {
        renderToday(await dueStore(), { he: false });
        expect(await screen.findByRole("button", { name: "Done — רחל כהן's follow-up" })).toBeTruthy();
      });
    });

    it("lists the clients quiet for half a year, with a message naming their personal year now", async () => {
      renderToday(fakeStore([RACHEL_OLD, YOSSI_NOW]));
      const panel = (await screen.findByRole("heading", { name: "כדאי לחזור אליהם" })).closest("section");
      const [row] = within(panel).getAllByRole("listitem");
      expect(within(row).getByText("פעילות אחרונה לפני 10 חודשים")).toBeTruthy(); // 300 days
      expect(within(panel).queryByText("יוסי לוי")).toBeNull(); // in touch two days ago
      const href = within(row).getByRole("link", { name: "הודעה לרחל כהן" }).getAttribute("href");
      expect(decodeURIComponent(href.split("?text=")[1])).toContain("עכשיו זו שנה אישית 5");
      expect(within(screen.getByRole("heading", { name: "מעקבים שהגיע זמנם" }).closest("section")).getByText("אין מעקבים שהגיע זמנם.")).toBeTruthy();
    });

    it("in July, offers every client their new year: eight first, the rest on asking", async () => {
      const JULY = new Date(2026, 6, 3, 10);
      const many = Array.from({ length: 11 }, (_, i) => ({ id: `c${i}`, fullName: `לקוח ${i + 1}`, birthDate: "1990-03-06", phone: "050-7654321", updatedAt: ago(i + 1, JULY), lastActivityAt: ago(i + 1, JULY) }));
      renderToday(fakeStore(many), { now: () => JULY });
      const panel = (await screen.findByRole("heading", { name: "השנה האישית החדשה" })).closest("section");
      expect(within(panel).getAllByRole("listitem")).toHaveLength(8);
      fireEvent.click(within(panel).getByRole("button", { name: "להציג את כל 11 הלקוחות" }));
      expect(within(panel).getAllByRole("listitem")).toHaveLength(11);
      expect(within(panel).queryByRole("button", { name: /להציג את כל/ })).toBeNull();
    });

    it("in July, offers every recent client their new personal year", async () => {
      const JULY = new Date(2026, 6, 3, 10);
      renderToday(fakeStore([{ ...YOSSI_NOW, phone: "050-7654321", updatedAt: ago(2, JULY), lastActivityAt: ago(2, JULY) }]), { now: () => JULY });
      const panel = (await screen.findByRole("heading", { name: "השנה האישית החדשה" })).closest("section");
      expect(within(panel).getByText("שנה אישית חדשה: 5")).toBeTruthy();
      const href = within(panel).getByRole("link", { name: "הודעה ליוסי לוי" }).getAttribute("href");
      expect(decodeURIComponent(href.split("?text=")[1])).toContain("שנה אישית חדשה התחילה: 5");
    });
  });

  it("explains the universal day and a client's personal year", async () => {
    renderToday(await storeWith([RACHEL]));
    fireEvent.click(screen.getByRole("button", { name: "איך זה חושב: היום האוניברסלי" }));
    // 6 October 2026: every digit of the date
    expect(within(screen.getByRole("dialog")).getByText("0+6+1+0+2+0+2+6 = 17")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByText("1+7 = 8")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "סגירה" }));
    fireEvent.click(await screen.findByRole("button", { name: "איך זה חושב: השנה האישית של רחל כהן" }));
    // her birthday, 7.10.2026, is in the +1 season
    expect(within(screen.getByRole("dialog")).getByText("מה-1.7 ועד ה-31.12 מוסיפים 1")).toBeTruthy();
  });

  it("signs the greeting with the studio's name", async () => {
    renderToday(await storeWith([RACHEL]), { signature: "שני כהן · נומרולוגיה" });
    const greeting = await screen.findByRole("link", { name: "ברכה לרחל כהן" });
    expect(greeting.getAttribute("href")).toBe(`https://wa.me/972521234567?text=${encodeURIComponent(`${RACHEL_GREETING_HE}\nשני כהן · נומרולוגיה`)}`);
  });

  it("lists this week's birthdays, soonest first, with the age and numbers, and a greeting only where there is a phone", async () => {
    const h = renderToday(await storeWith(ALL));
    const rows = await within(panel("ימי הולדת השבוע")).findAllByRole("listitem");
    expect(rows.map(nameIn)).toEqual(["יוסי לוי", "רחל כהן", "מיכל אברהם"]);

    const [yossi, rachel, michal] = rows;
    expect(within(yossi).getByText("היום · 6.10 · יום הולדת 36")).toBeTruthy();
    expect(within(yossi).getByText("מסלול 6")).toBeTruthy();
    expect(within(yossi).queryByRole("link")).toBeNull();
    expect(within(yossi).getByText("אין טלפון בתיק, אז אין ברכה בוואטסאפ")).toBeTruthy();

    expect(within(rachel).getByText("מחר · 7.10 · יום הולדת 41")).toBeTruthy();
    expect(within(rachel).getByText("מסלול 7")).toBeTruthy();
    expect(within(rachel).getByText("שנה אישית 5")).toBeTruthy();
    const greeting = within(rachel).getByRole("link", { name: "ברכה לרחל כהן" });
    const text = encodeURIComponent(RACHEL_GREETING_HE);
    expect(greeting.getAttribute("href")).toBe(`https://wa.me/972521234567?text=${text}`);
    expect(greeting.getAttribute("title")).toBe(RACHEL_GREETING_HE); // the message, before it is sent
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

  // the quick actions moved (2026-10-12): a new client and meeting mode beside the new reading, quick search among the tools
  it("offers a new client and meeting mode with today's energy, and quick search among the tools", async () => {
    const h = renderToday(await storeWith([]));
    const energy = panel("האנרגיה של היום");
    fireEvent.click(within(energy).getByRole("button", { name: "לקוח חדש" }));
    fireEvent.click(within(energy).getByRole("button", { name: "מצב פגישה" }));
    const search = within(panel("כל הכלים")).getByRole("button", { name: "חיפוש מהיר" });
    expect(search.textContent).toContain("Ctrl K");
    expect(search.getAttribute("aria-keyshortcuts")).toContain("Control+K");
    fireEvent.click(search);
    expect([h.onNewClient, h.onMeeting, h.onSearch].map((fn) => fn.mock.calls)).toEqual([[[]], [[]], [[]]]);
    await screen.findAllByText(EMPTY_HE);
  });

  it("leaves out an action the app has not wired", async () => {
    renderToday(await storeWith([]), { onMeeting: undefined, onSearch: undefined });
    const energy = panel("האנרגיה של היום");
    expect(within(energy).queryByRole("button", { name: "מצב פגישה" })).toBeNull();
    expect(within(energy).getAllByRole("button").map((b) => b.textContent)).toEqual(["קריאה חדשה", "לקוח חדש", expect.any(String)]); // and how the day is counted
    expect(screen.queryByRole("heading", { name: "כל הכלים" })).toBeNull(); // no tools and no search: no tiles
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
    const text = encodeURIComponent(RACHEL_GREETING_EN);
    expect(greeting.getAttribute("href")).toBe(`https://wa.me/972521234567?text=${text}`);
    expect(within(michal).getByText("In 5 days · 11.10 · Turning 48")).toBeTruthy();

    expect(within(panel("Recent clients")).getByRole("button", { name: /דנה שמיר.*Life path 3/ })).toBeTruthy();
    for (const name of ["New client", "Meeting mode"]) expect(within(panel("Today's energy")).getByRole("button", { name })).toBeTruthy();
    expect(within(panel("All the tools")).getByRole("button", { name: "Quick search" })).toBeTruthy();
    expect(within(panel("Today's card")).getByText("החפיסה כאן")).toBeTruthy();
  });

  describe("the dashboard", () => {
    const TOOLS = [
      { k: "today", i: "sparkles", he: "היום", en: "Today" },
      { k: "clients", i: "user", he: "לקוחות", en: "Clients" },
      { k: "cards", i: "cards", he: "קלפים", en: "Cards" },
    ];
    /** A saved reading of `clientId`, with this follow-up date or none. */
    const reading = (clientId, followUp = null) => ({
      clientId, type: "yearCycle", input: { birthDate: "1985-10-07", add: false }, result: { proj: [{ year: 2026, py: 5, isCurrent: true }] },
      engineVersion: "2.0.0", computedFor: "2026-09-01T09:00:00.000Z", followUp,
    });
    /** ALL's clients (id-1 RACHEL to id-6 NOA), RACHEL's follow-up overdue, DANA's on Friday, and a reading of MICHAL's with none. */
    async function busyStore() {
      const store = await storeWith(ALL);
      await store.readings.create(reading("id-1", "2026-10-01"));
      await store.readings.create(reading("id-4", "2026-10-09"));
      await store.readings.create(reading("id-3"));
      return store;
    }
    const figure = (name) => within(screen.getByRole("region", { name: "נתונים מהתיק" })).findByRole("button", { name });

    it("draws the clients' life paths on the wheel, a master path with the number it reduces to", async () => {
      // Arrange: the engine's paths, by birth date (NOA has no birth date, URI is archived)
      const PATHS = { "1985-10-07": 11, "1990-10-06": 6, "1978-10-11": 22, "1992-03-03": 6 };

      // Act
      renderToday(await storeWith(ALL), { lifePath: (iso) => PATHS[iso] });

      // Assert
      const wheel = await screen.findByRole("img", { name: /לקוחות לפי שביל גורל/ });
      expect(wheel.getAttribute("aria-label")).toBe(
        "גלגל המספרים 1 עד 9. היום האוניברסלי הוא 8. לקוחות לפי שביל גורל: 2: לקוח אחד, 4: לקוח אחד, 6: 2 לקוחות. 11, 22 ו-33 נספרים עם 2, 4 ו-6.",
      );
      const counts = [...document.querySelectorAll(".st-wheel-count-num")];
      expect(counts.map((c) => c.getAttribute("title"))).toEqual(["שביל גורל 2: לקוח אחד", "שביל גורל 4: לקוח אחד", "שביל גורל 6: 2 לקוחות"]);
      expect(counts.map((c) => c.textContent)).toEqual(["1", "1", "2"]);
      const [one, , two] = [...document.querySelectorAll(".st-wheel-count circle")].map((c) => Number(c.getAttribute("r")));
      expect(two).toBeGreaterThan(one); // the bigger count, the bigger bubble
      expect(screen.getByText("לקוחות בכל שביל גורל")).toBeTruthy();
      expect(screen.getByText("11, 22 ו-33 נספרים עם 2, 4 ו-6")).toBeTruthy();
      expect(document.querySelector(".st-wheel-num.is-today").textContent).toBe("8");
    });

    it("says on the wheel when no client has a birth date yet, and draws no bubbles", async () => {
      renderToday(await storeWith([NOA]));
      const wheel = await screen.findByRole("img", { name: /עוד אין לקוחות עם תאריך לידה/ });
      expect(wheel.getAttribute("aria-label")).toBe("גלגל המספרים 1 עד 9. היום האוניברסלי הוא 8. עוד אין לקוחות עם תאריך לידה.");
      expect(document.querySelectorAll(".st-wheel-count, .st-wheel-count-num")).toHaveLength(0);
      expect(screen.getByText("כאן יופיע כמה לקוחות יש בכל שביל גורל.")).toBeTruthy();
    });

    it("counts the clients, the saved readings, the follow-ups due and this week's birthdays, and each leads to its place", async () => {
      const onTool = vi.fn();
      renderToday(await busyStore(), { tools: TOOLS, onTool });
      fireEvent.click(await figure("5 לקוחות פעילים, לפתיחת הלקוחות"));
      fireEvent.click(await figure("3 קריאות שמורות, לתיקי הלקוחות"));
      expect(onTool.mock.calls).toEqual([["clients"], ["clients"]]);
      fireEvent.click(await figure("מעקב אחד שהגיע זמנו, לרשימת המעקבים"));
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "מעקבים שהגיע זמנם" }));
      fireEvent.click(await figure("3 ימי הולדת בשבוע הקרוב, לרשימת ימי ההולדת"));
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "ימי הולדת השבוע" }));
    });

    it("keeps the figures quiet while they load, and shows a dash for the ones that could not", async () => {
      const flaky = failingOnce(await storeWith([RACHEL]));
      renderToday(flaky.store);
      const figures = screen.getByRole("region", { name: "נתונים מהתיק" });
      expect(figures.querySelectorAll(".st-skel")).toHaveLength(4);
      expect(figures.querySelectorAll("[aria-busy='true']")).toHaveLength(4);
      await screen.findByRole("alert");
      // the clients failed: their figures (clients, birthdays) show a dash; the summary came, so its figures are there
      expect([...figures.querySelectorAll(".st-stat-num")].map((n) => n.textContent)).toEqual(["—", "0", "0", "—"]);
      expect(within(figures).getAllByText("(לא נטען)")).toHaveLength(2);
      expect(figures.querySelectorAll(".st-skel")).toHaveLength(0);
    });

    it("lays out the week ahead, the birthdays and the follow-ups on their days; the panel lists only the ones due", async () => {
      renderToday(await busyStore());
      const days = await within(panel("השבוע הקרוב")).findAllByRole("listitem");
      expect(days).toHaveLength(7);
      await within(days[0]).findByText("יום שלישי 6.10, היום: יום הולדת של יוסי לוי, מעקב עם רחל כהן.");
      expect(days[0].className).toContain("is-today");
      expect(within(days[1]).getByText("יום רביעי 7.10: יום הולדת של רחל כהן.")).toBeTruthy();
      expect(within(days[2]).getByText("יום חמישי 8.10: אין ימי הולדת או מעקבים.")).toBeTruthy(); // URI's birthday: archived
      expect(within(days[3]).getByText("יום שישי 9.10: מעקב עם דנה שמיר.")).toBeTruthy();
      expect(within(days[5]).getByText("יום ראשון 11.10: יום הולדת של מיכל אברהם.")).toBeTruthy();
      const due = panel("מעקבים שהגיע זמנם");
      expect(within(due).getAllByRole("listitem").map(nameIn)).toEqual(["רחל כהן"]); // DANA's is on Friday
    });

    it("never reads a day as empty while its data loads or when it failed to load", async () => {
      // the clients fail once; the summary comes
      const flaky = failingOnce(await storeWith([YOSSI]));
      renderToday(flaky.store);
      const week = panel("השבוע הקרוב");
      expect(within(week).getAllByRole("listitem")[1].textContent).toContain("יום רביעי 7.10.");
      await screen.findByRole("alert");
      const days = within(panel("השבוע הקרוב")).getAllByRole("listitem");
      expect(within(days[0]).getByText("יום שלישי 6.10, היום: ימי ההולדת לא נטענו.")).toBeTruthy();
      expect(within(panel("השבוע הקרוב")).getByText("חלק מהנתונים של השבוע לא נטענו.")).toBeTruthy();
      cleanup();
      // now the summary fails: the birthdays are known, the follow-ups are not
      const store = await storeWith([YOSSI]);
      renderToday({ ...store, summary: () => Promise.reject(new Error("offline")) });
      const today = (await within(panel("השבוע הקרוב")).findAllByRole("listitem"))[0];
      expect(await within(today).findByText("יום שלישי 6.10, היום: יום הולדת של יוסי לוי. המעקבים לא נטענו.")).toBeTruthy();
    });

    it("names three on a day and counts the rest", async () => {
      const born = (name, year) => ({ fullName: name, birthDate: `${year}-10-06` });
      renderToday(await storeWith([born("אלה א", 1980), born("בני ב", 1981), born("גלי ג", 1982), born("דן ד", 1983)]));
      const today = (await within(panel("השבוע הקרוב")).findAllByRole("listitem"))[0];
      await within(today).findByText(/יום הולדת של דן ד/);
      expect(today.querySelectorAll(".st-week-ev")).toHaveLength(3);
      expect(today.querySelector(".st-week-more").textContent).toBe("עוד 1"); // "+1" would turn round in a right-to-left line
      expect([...today.querySelectorAll(".st-week-initials")].map((i) => i.textContent)).toEqual(["אא", "בב", "גג"]);
    });

    it("asks the store for the follow-ups up to the week's last day", async () => {
      const store = await storeWith([RACHEL]);
      const summary = vi.fn(store.summary);
      renderToday({ ...store, summary });
      await screen.findAllByText("אין מעקבים שהגיע זמנם.");
      expect(summary).toHaveBeenCalledWith(new Date(2026, 9, 12));
    });

    it("shows three first steps instead of the week while there are no clients", async () => {
      renderToday(await storeWith([]));
      expect(await screen.findAllByText(EMPTY_HE)).toHaveLength(2);
      const steps = within(panel("מתחילים כאן")).getAllByRole("listitem");
      expect(steps.map((s) => s.textContent)).toEqual([
        "מוסיפים לקוח ב׳לקוח חדש׳: שם, תאריך לידה וטלפון.",
        "עושים קריאה ושומרים אותה בתיק של הלקוח.",
        "קובעים תאריך מעקב, והוא יופיע כאן ביום שלו.",
      ]);
      expect(screen.queryByRole("heading", { name: "השבוע הקרוב" })).toBeNull();
    });

    it("lists every tool but today, each with a line on what it is for, and opens one", async () => {
      const onTool = vi.fn();
      renderToday(await storeWith([]), { tools: TOOLS, onTool });
      const tiles = within(panel("כל הכלים")).getAllByRole("button");
      // quick search first, as a bar, then a tile for each tool
      expect(tiles.map((t) => document.getElementById(t.getAttribute("aria-labelledby")).textContent)).toEqual(["חיפוש מהיר", "לקוחות", "קלפים"]);
      expect(document.getElementById(tiles[0].getAttribute("aria-describedby")).textContent).toBe("לקוח, כלי או פעולה, מכל מסך");
      const clients = within(panel("כל הכלים")).getByRole("button", { name: "לקוחות" });
      expect(document.getElementById(clients.getAttribute("aria-describedby")).textContent).toBe("תיק לכל לקוח, עם הקריאות והמעקבים");
      fireEvent.click(within(panel("כל הכלים")).getByRole("button", { name: "קלפים" }));
      expect(onTool).toHaveBeenCalledWith("cards");
      await screen.findAllByText(EMPTY_HE);
    });

    it("speaks English on the wheel, the figures and the week", async () => {
      renderToday(await busyStore(), { he: false, tools: TOOLS, onTool: vi.fn() });
      expect((await screen.findByRole("img", { name: /Clients by life path/ })).getAttribute("aria-label")).toBe(
        "The wheel of numbers 1 to 9. The universal day is 8. Clients by life path: 1: 1 client, 3: 1 client, 6: 1 client, 7: 1 client.",
      );
      expect(await within(screen.getByRole("region", { name: "From the client files" })).findByRole("button", { name: "5 active clients, open the clients" })).toBeTruthy();
      const days = await within(panel("The week ahead")).findAllByRole("listitem");
      await within(days[0]).findByText("Tuesday 6.10, today: יוסי לוי's birthday; a follow-up with רחל כהן.");
      expect(within(panel("All the tools")).getByRole("button", { name: "Cards" })).toBeTruthy();
    });
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
