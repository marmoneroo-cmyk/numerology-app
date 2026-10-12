// @vitest-environment jsdom
/*
 * The number library (the owner, 2026-10-12, in place of the tarot): every number the method knows, each opening a
 * page made only of what the Studio already says about it.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import NumberLibrary, { DayNumber, numberTitle, LIBRARY_GROUPS } from "../NumberLibrary.jsx";
import { DemoLockContext } from "../../../demo/DemoLock.jsx";

afterEach(cleanup);

const BASE = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, { t: `ארכיטיפ ${n}`, te: `Archetype ${n}`, s: `מילים ${n}`, se: `Words ${n}`, c: "#c8a96a" }]));
const TEXTS = {
  D: {
    ...BASE,
    7: {
      t: "החוקר", te: "The Seeker", s: "חכמה · אמת · עומק", se: "Wisdom · Truth · Depth", c: "#B57EDC",
      narrative: "אנשי 7 מחפשים את האמת.", narrativeE: "Sevens look for the truth.",
      shadow: "ריחוק, ספקנות", shadowE: "Distance, doubt", growth: "לסמוך ולשתף", growthE: "Trust and share",
      el: "מים", stone: "אמטיסט", crystal: "קוורץ", color: "סגול", career: "חוקר, מורה", luck: "שביעי",
      ritual: { word: "שקט", wordE: "Stillness", act: "לשבת בשקט עשר דקות", actE: "Sit still for ten minutes", reflect: "מה באמת חשוב?", reflectE: "What truly matters?", micro: "לכתוב שאלה אחת", microE: "Write one question" },
    },
  },
  MASTER: { 11: { t: "המאיר", te: "The Illuminator", he: "ערוץ רוחני שמחבר בין עולמות.", en: "A spiritual channel between worlds.", c: "#C0C0FF" }, 22: { t: "בונה המאסטר", te: "The Master Builder", he: "חזון מעשי.", en: "Practical vision." }, 33: { t: "המרפא", te: "The Master Healer", he: "אהבה אוניברסלית.", en: "Universal love." } },
  KARMA: { 13: { he: "חוב של עצלות — המציאות דורשת התמדה.", en: "Laziness debt — This life demands perseverance." }, 14: { he: "חוב של שליטה — השיעור הוא משמעת עצמית.", en: "Control debt — Self-discipline." }, 16: { he: "חוב של אגו — ענווה.", en: "Ego debt — Humility." }, 19: { he: "חוב של כוח — אחריות.", en: "Power debt — Responsibility." } },
  YEAR_ENERGY: { 7: { he: "שנת התבוננות פנימית.", en: "Year of inner reflection." } },
  NUM_LIB: { 7: { icon: "eye", he: { k: "חכמה, אמת, עומק", p: "אנרגיה של חיפוש ושל ידיעה." }, en: { k: "Wisdom, Truth, Depth", p: "The energy of seeking and knowing." } }, 11: { icon: "bolt", he: { k: "אינטואיציה, השראה", p: "רגישות גבוהה במיוחד." }, en: { k: "Intuition, Inspiration", p: "Exceptionally high sensitivity." } } },
  TRAITS: { 7: { he: { str: ["חכמה ותבונה"], ch: ["ריחוק רגשי"], soul: "לשתף את מה שיודעים" }, en: { str: ["Wisdom"], ch: ["Emotional distance"], soul: "To share what is known" } } },
};

/** The library as a screen holds it: which number is open. */
function Library({ he = true, onOpenSpy = () => {} }) {
  const [open, setOpen] = useState(null);
  return <NumberLibrary he={he} texts={TEXTS} open={open} onOpen={(n) => (onOpenSpy(n), setOpen(n))} onClose={() => setOpen(null)} />;
}
const section = (name) => screen.getByRole("heading", { name }).closest("section");

describe("the number library", () => {
  it("lists 1 to 9, the master numbers and the karmic debts, each a button named by its number and title", () => {
    render(<Library />);
    expect(LIBRARY_GROUPS.map((g) => g.numbers)).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9], [11, 22, 33], [13, 14, 16, 19]]);
    expect(within(section("המספרים 1–9")).getAllByRole("button").map((b) => b.textContent)).toHaveLength(9);
    expect(screen.getByRole("button", { name: "7 · החוקר" })).toBeTruthy();
    expect(within(section("מספרי מאסטר")).getByRole("button", { name: "11 · המאיר" })).toBeTruthy();
    expect(within(section("חובות קארמיים")).getByRole("button", { name: "13 · חוב של עצלות" })).toBeTruthy();
  });

  it("opens a number's page with everything the Studio says about it", () => {
    const opened = vi.fn();
    render(<Library onOpenSpy={opened} />);
    fireEvent.click(screen.getByRole("button", { name: "7 · החוקר" }));
    expect(opened).toHaveBeenCalledWith(7);
    const page = screen.getByRole("heading", { level: 2, name: "7 · החוקר" }).closest("article");
    expect(document.activeElement).toBe(within(page).getByRole("heading", { level: 2 }));
    expect(within(page).getByText("חכמה · אמת · עומק")).toBeTruthy();
    expect(within(section("המהות")).getByText("אנרגיה של חיפוש ושל ידיעה.")).toBeTruthy();
    expect(within(section("הסיפור של אנשי 7")).getByText("אנשי 7 מחפשים את האמת.")).toBeTruthy();
    expect(within(section("חוזקות")).getByText("חכמה ותבונה")).toBeTruthy();
    expect(within(section("אתגרים")).getByText("ריחוק רגשי")).toBeTruthy();
    expect(within(section("השיעור")).getByText("לשתף את מה שיודעים")).toBeTruthy();
    expect(within(section("צל וצמיחה")).getByText("ריחוק, ספקנות")).toBeTruthy();
    expect(within(section("צל וצמיחה")).getByText("לסמוך ולשתף")).toBeTruthy();
    expect(within(section("כשנה אישית")).getByText("שנת התבוננות פנימית.")).toBeTruthy();
    const facts = within(section("מאפיינים")).getAllByRole("term").map((dt) => [dt.textContent, dt.nextElementSibling.textContent]);
    expect(facts).toEqual([["אבן", "אמטיסט"], ["קריסטל", "קוורץ"], ["צבע", "סגול"], ["יסוד", "מים"], ["קריירה", "חוקר, מורה"], ["יום מזל", "שביעי"]]);
    const ritual = within(section("טקס")).getAllByRole("term").map((dt) => [dt.textContent, dt.nextElementSibling.textContent]);
    expect(ritual).toEqual([["מילה", "שקט"], ["פעולה", "לשבת בשקט עשר דקות"], ["טקס קטן", "לכתוב שאלה אחת"], ["שאלה למחשבה", "מה באמת חשוב?"]]);
  });

  it("goes back to every number, with the focus on the one it came from", () => {
    render(<Library />);
    fireEvent.click(screen.getByRole("button", { name: "7 · החוקר" }));
    fireEvent.click(screen.getByRole("button", { name: "לכל המספרים" }));
    expect(screen.queryByRole("heading", { level: 2, name: "7 · החוקר" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "7 · החוקר" }));
  });

  it("gives a master number its own text, and the digit it comes down to, which opens in turn", () => {
    render(<Library />);
    fireEvent.click(screen.getByRole("button", { name: "11 · המאיר" }));
    expect(within(section("מספר מאסטר")).getByText("ערוץ רוחני שמחבר בין עולמות.")).toBeTruthy();
    expect(within(section("המהות")).getByText("רגישות גבוהה במיוחד.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "בספרה אחת: 2 · ארכיטיפ 2" }));
    expect(screen.getByRole("heading", { level: 2, name: "2 · ארכיטיפ 2" })).toBeTruthy();
  });

  it("gives a karmic debt its lesson, and the digit it comes down to", () => {
    render(<Library />);
    fireEvent.click(screen.getByRole("button", { name: "13 · חוב של עצלות" }));
    expect(within(section("החוב")).getByText("המציאות דורשת התמדה.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "בספרה אחת: 4 · ארכיטיפ 4" })).toBeTruthy();
  });

  it("leaves out what the Studio has no text for, rather than an empty heading", () => {
    render(<Library />);
    fireEvent.click(screen.getByRole("button", { name: "3 · ארכיטיפ 3" }));
    expect(screen.getByRole("heading", { level: 2, name: "3 · ארכיטיפ 3" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "המהות" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "טקס" })).toBeNull();
  });

  it("in the demo shows every number and title, and blurs the interpretations", () => {
    render(
      <DemoLockContext.Provider value>
        <Library />
      </DemoLockContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "7 · החוקר" }));
    expect(screen.getByRole("heading", { level: 2, name: "7 · החוקר" })).toBeTruthy();
    expect(screen.queryByText("אנשי 7 מחפשים את האמת.")).toBeNull();
    expect(screen.queryByText("שנת התבוננות פנימית.")).toBeNull();
    expect(screen.getAllByText("הפירוש המלא נפתח במנוי").length).toBeGreaterThan(0);
    // and says so where it shows: the first interpretation carries the visible note
    expect(within(section("המהות")).getByText("הפירוש המלא נפתח במנוי").closest(".demo-lock-chip")).toBeTruthy();
  });

  it("speaks English", () => {
    render(<Library he={false} />);
    expect(screen.getByRole("heading", { name: "Master numbers" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "7 · The Seeker" }));
    expect(within(section("The story of the 7s")).getByText("Sevens look for the truth.")).toBeTruthy();
    expect(within(section("As a personal year")).getByText("Year of inner reflection.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "All the numbers" })).toBeTruthy();
  });
});

describe("today's number", () => {
  it("shows the day's number and its title, and opens its page", () => {
    const onOpen = vi.fn();
    render(<DayNumber he texts={TEXTS} n={7} onOpen={onOpen} />);
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("החוקר")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "לעמוד של המספר 7" }));
    expect(onOpen).toHaveBeenCalledWith(7);
  });

  it("names each number by its title, a master's own and a debt's", () => {
    expect([numberTitle(TEXTS, 7, true), numberTitle(TEXTS, 11, true), numberTitle(TEXTS, 13, true), numberTitle(TEXTS, 13, false)]).toEqual(["החוקר", "המאיר", "חוב של עצלות", "Laziness debt"]);
  });
});
