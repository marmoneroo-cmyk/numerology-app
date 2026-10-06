// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { StrictMode, useCallback, useState } from "react";
import CommandPalette, { useCommandShortcut, normalize } from "../CommandPalette.jsx";
import { vibrate } from "../motion.js";

// the palette buzzes when it opens; the real vibrate is tested in motion.test.js
vi.mock("../motion.js", async (importOriginal) => ({ ...(await importOriginal()), vibrate: vi.fn(() => false) }));

const realScrollIntoView = Element.prototype.scrollIntoView; // jsdom has none; one test adds it

/** Sample items, each with its own run spy. Two of them have no keywords, one has no hint either. */
const makeItems = () =>
  [
    { id: "reading", label: "קריאה", hint: "כלי", keywords: ["Reading"] },
    { id: "cards", label: "קלפים", hint: "כלי", keywords: ["cards", "טארוט"] },
    { id: "money", label: "כסף ושפע", hint: "כלי" },
    { id: "rachel", label: "רחל כהן", hint: "מסלול חיים 7", keywords: ["לקוח"] },
    { id: "rachel-a", label: "רחל אברהם", hint: "מסלול חיים 3", keywords: ["לקוח"] },
    { id: "shlomit", label: "שלומית לוי", hint: "מסלול חיים 11", keywords: ["לקוח"] },
    { id: "new-reading", label: "קריאה חדשה" },
  ].map((item) => ({ ...item, run: vi.fn() }));

const HE_KEYS = "חצים לבחירה · Enter לפתיחה · Esc לסגירה";
const EMPTY = "לא נמצא. נסו מילה אחרת.";

const input = () => screen.getByRole("combobox");
const type = (text) => fireEvent.change(input(), { target: { value: text } });
const press = (key, init = {}) => fireEvent.keyDown(input(), { key, ...init });
const labels = () => screen.queryAllByRole("option").map((o) => o.querySelector(".st-palette-label").textContent);
const activeLabel = () => document.getElementById(input().getAttribute("aria-activedescendant")).querySelector(".st-palette-label").textContent;
const pageOverflow = () => document.documentElement.style.overflow;

function showPalette({ items = makeItems(), he = true } = {}) {
  const onClose = vi.fn();
  const view = render(<CommandPalette open onClose={onClose} he={he} items={items} />);
  return { onClose, items, ...view };
}

/** A page with a button that opens the palette, and another button somewhere else. */
function Page({ items, onClose = () => {} }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>open</button>
      <button type="button">elsewhere</button>
      <CommandPalette
        open={isOpen}
        he
        items={items}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    </>
  );
}

/** Opens the Page's palette from its button, which has the focus first. */
function openFromButton() {
  const opener = screen.getByRole("button", { name: "open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

function Shortcut({ onOpen, enabled }) {
  useCommandShortcut(onOpen, enabled);
  return null;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = realScrollIntoView;
  document.documentElement.style.overflow = "";
});

describe("normalize", () => {
  it("lower-cases, trims, and turns Hebrew final letters into their regular forms", () => {
    expect(normalize("  Quick SEARCH ")).toBe("quick search");
    expect(normalize("ךםןףץ")).toBe("כמנפצ");
    expect(normalize("כסף ושלום")).toBe("כספ ושלומ");
    expect(normalize(undefined)).toBe("");
  });
});

describe("CommandPalette", () => {
  it("is a labelled modal dialog on the body, whose input drives a listbox", () => {
    const { items } = showPalette();
    const dialog = screen.getByRole("dialog", { name: "חיפוש מהיר" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const root = dialog.parentElement;
    expect(root.parentElement).toBe(document.body);
    expect(root.classList.contains("st-root")).toBe(true);
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.getAttribute("lang")).toBe("he");

    const box = screen.getByRole("combobox", { name: "חיפוש כלי, לקוח או פעולה" });
    expect(box.getAttribute("placeholder")).toBe("חיפוש כלי, לקוח או פעולה");
    expect(document.activeElement).toBe(box);
    expect(box.getAttribute("aria-expanded")).toBe("true");
    expect(box.getAttribute("aria-controls")).toBe(screen.getByRole("listbox").id);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(items.length);
    expect(box.getAttribute("aria-activedescendant")).toBe(options[0].id);
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual(["true", ...Array(items.length - 1).fill("false")]);
    expect(within(options[3]).getByText("מסלול חיים 7").className).toBe("st-palette-hint");
    expect(options[6].querySelector(".st-palette-hint")).toBeNull();

    expect(screen.getByText(HE_KEYS)).toBeTruthy();
    expect(document.getElementById(box.getAttribute("aria-describedby")).textContent).toBe(HE_KEYS);
    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it("filters by label and keywords, ignoring case, and shows everything for an empty query", () => {
    const { items } = showPalette();
    type("קריאה");
    expect(labels()).toEqual(["קריאה", "קריאה חדשה"]);
    type("READING");
    expect(labels()).toEqual(["קריאה"]);
    type("טארוט");
    expect(labels()).toEqual(["קלפים"]);
    type("  לקוח ");
    expect(labels()).toEqual(["רחל כהן", "רחל אברהם", "שלומית לוי"]);
    type("");
    expect(labels()).toEqual(items.map((item) => item.label));
  });

  it("matches Hebrew final letters with their regular forms, both ways", () => {
    showPalette();
    type("כספ"); // typed without the final form
    expect(labels()).toEqual(["כסף ושפע"]);
    type("שלום"); // typed with a final mem, inside a longer name
    expect(labels()).toEqual(["שלומית לוי"]);
    type("כהנ");
    expect(labels()).toEqual(["רחל כהן"]);
  });

  it("needs every word of the query, in any order, from the label or the keywords", () => {
    showPalette();
    type("רחל כה");
    expect(labels()).toEqual(["רחל כהן"]);
    type("כהן   רחל");
    expect(labels()).toEqual(["רחל כהן"]);
    type("רחל");
    expect(labels()).toEqual(["רחל כהן", "רחל אברהם"]);
    type("רחל לקוח");
    expect(labels()).toEqual(["רחל כהן", "רחל אברהם"]);
  });

  it("shows at most 50 results, and a search still reaches the rest", () => {
    const many = Array.from({ length: 60 }, (_, n) => ({ id: `n${n}`, label: `לקוח ${n}`, run: vi.fn() }));
    showPalette({ items: many });
    expect(screen.getAllByRole("option")).toHaveLength(50);
    type("לקוח");
    expect(screen.getAllByRole("option")).toHaveLength(50);
    type("59");
    expect(labels()).toEqual(["לקוח 59"]);
  });

  it("moves with the arrows, wrapping at both ends, and Enter runs the active item and then closes", () => {
    const scrolled = [];
    Element.prototype.scrollIntoView = function scrollIntoView(options) {
      scrolled.push({ element: this, options });
    };
    const { items, onClose } = showPalette({ items: makeItems().slice(0, 3) });
    expect(activeLabel()).toBe("קריאה");
    expect(press("ArrowDown")).toBe(false);
    expect(activeLabel()).toBe("קלפים");
    expect(scrolled.at(-1).element).toBe(screen.getAllByRole("option")[1]);
    expect(scrolled.at(-1).options).toEqual({ block: "nearest" });
    press("ArrowDown");
    expect(activeLabel()).toBe("כסף ושפע");
    press("ArrowDown");
    expect(activeLabel()).toBe("קריאה");
    expect(press("ArrowUp")).toBe(false);
    expect(activeLabel()).toBe("כסף ושפע");
    press("ArrowUp");
    expect(activeLabel()).toBe("קלפים");
    expect(screen.getAllByRole("option").map((o) => o.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);

    expect(press("Enter")).toBe(false);
    expect(items[1].run).toHaveBeenCalledTimes(1);
    expect(items[0].run).not.toHaveBeenCalled();
    expect(items[2].run).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(items[1].run.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it("starts again from the first result when the query changes, and stays valid when the items change", () => {
    const { items, onClose, rerender } = showPalette();
    press("ArrowDown");
    expect(activeLabel()).toBe("קלפים");
    type("קריאה");
    expect(activeLabel()).toBe("קריאה");
    press("ArrowUp");
    expect(activeLabel()).toBe("קריאה חדשה");
    rerender(<CommandPalette open onClose={onClose} he items={items.slice(0, 1)} />);
    expect(labels()).toEqual(["קריאה"]);
    expect(activeLabel()).toBe("קריאה");
  });

  it("ignores a held Enter and any key pressed while an input method is still composing", () => {
    const { items, onClose } = showPalette();
    expect(press("Enter", { repeat: true })).toBe(true); // say, the Enter that opened the palette, still held
    press("ArrowDown", { isComposing: true });
    press("Enter", { isComposing: true });
    press("Escape", { isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
    items.forEach((item) => expect(item.run).not.toHaveBeenCalled());
    expect(activeLabel()).toBe("קריאה");
    press("ArrowDown", { repeat: true }); // a held arrow still moves
    expect(activeLabel()).toBe("קלפים");
  });

  it("closes on Escape without letting the key reach the page, and gives the focus back", () => {
    const onClose = vi.fn();
    render(<Page items={makeItems()} onClose={onClose} />);
    const opener = openFromButton();
    expect(document.activeElement).toBe(input());
    expect(vibrate).toHaveBeenCalledWith(8);

    const page = vi.fn(); // such as the meeting mode underneath, which listens on the document
    document.addEventListener("keydown", page);
    window.addEventListener("keydown", page);
    try {
      expect(press("Escape")).toBe(false);
    } finally {
      document.removeEventListener("keydown", page);
      window.removeEventListener("keydown", page);
    }
    expect(page).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("gives the focus back after Enter too, unless the chosen item moved it somewhere else", () => {
    const elsewhere = () => screen.getByRole("button", { name: "elsewhere" });
    const items = [
      { id: "stay", label: "קלפים", run: vi.fn() },
      { id: "move", label: "לקוחות", run: () => elsewhere().focus() },
    ];
    render(<Page items={items} />);
    const opener = openFromButton();
    press("Enter");
    expect(items[0].run).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);
    const openerFocus = vi.fn();
    opener.addEventListener("focus", openerFocus);
    press("ArrowDown");
    press("Enter");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(elsewhere());
    expect(openerFocus).not.toHaveBeenCalled(); // not even for a moment
  });

  it("gives the focus back after a click on the backdrop, and copes when nothing had the focus", () => {
    render(<Page items={makeItems()} />);
    const opener = openFromButton();
    const backdrop = () => screen.getByRole("dialog").parentElement;
    fireEvent.mouseDown(backdrop());
    fireEvent.click(backdrop());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);

    opener.blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(opener); // a scripted click leaves the focus where it is
    expect(document.activeElement).toBe(input());
    press("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("keeps Tab inside (the input is the only stop) and leaves other keys to the input", () => {
    showPalette();
    expect(press("Tab")).toBe(false);
    expect(press("Tab", { shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(input());
    expect(press("a")).toBe(true);
    expect(press("Backspace")).toBe(true);
  });

  it("makes a hovered option active, runs a clicked one, and stops presses from moving the focus", () => {
    const { items, onClose } = showPalette();
    const options = screen.getAllByRole("option");
    fireEvent.mouseMove(options[2]);
    expect(input().getAttribute("aria-activedescendant")).toBe(options[2].id);
    expect(options[2].getAttribute("aria-selected")).toBe("true");
    expect(options[0].getAttribute("aria-selected")).toBe("false");

    // a press's default action is what moves the focus: it is cancelled on the options, not on the input
    expect(fireEvent.mouseDown(options[1])).toBe(false);
    expect(fireEvent.mouseDown(input())).toBe(true);
    fireEvent.click(options[1]);
    expect(items[1].run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a click on the backdrop, but not on a click inside the panel or a drag that started there", () => {
    const { onClose } = showPalette();
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement;
    fireEvent.click(dialog);
    fireEvent.click(screen.getByRole("listbox"));
    fireEvent.click(screen.getByText(HE_KEYS));
    fireEvent.click(input());
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(input()); // say, selecting the query, and letting go over the backdrop
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the page behind still while open, then puts the page's own setting back", () => {
    document.documentElement.style.overflow = "auto";
    const { onClose, rerender } = showPalette();
    expect(pageOverflow()).toBe("hidden");
    rerender(<CommandPalette open={false} onClose={onClose} he items={[]} />);
    expect(pageOverflow()).toBe("auto");
  });

  it("works the same under StrictMode, which the app uses", () => {
    render(
      <StrictMode>
        <Page items={makeItems()} />
      </StrictMode>,
    );
    const opener = openFromButton();
    expect(document.activeElement).toBe(input());
    expect(pageOverflow()).toBe("hidden");
    press("ArrowDown");
    expect(activeLabel()).toBe("קלפים");
    press("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(pageOverflow()).toBe("");
  });

  it("says so when nothing matches, and the keys then do nothing", () => {
    const { items, onClose } = showPalette();
    expect(screen.getByRole("status").textContent).toBe("");
    type("zzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toBe(EMPTY);
    expect(input().hasAttribute("aria-activedescendant")).toBe(false);
    expect(input().getAttribute("aria-expanded")).toBe("false");
    press("ArrowDown");
    press("ArrowUp");
    press("Enter");
    expect(onClose).not.toHaveBeenCalled();
    items.forEach((item) => expect(item.run).not.toHaveBeenCalled());
    type("");
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getAllByRole("option")).toHaveLength(items.length);
  });

  it("copes with no items at all", () => {
    render(<CommandPalette open onClose={() => {}} he items={null} />);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toBe(EMPTY);
  });

  it("renders nothing while closed", () => {
    render(<CommandPalette open={false} onClose={() => {}} he items={makeItems()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".st-palette")).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
    expect(pageOverflow()).toBe("");
  });

  it("speaks English when he is false", () => {
    showPalette({ he: false });
    const dialog = screen.getByRole("dialog", { name: "Quick search" });
    expect(dialog.parentElement.getAttribute("dir")).toBe("ltr");
    expect(dialog.parentElement.getAttribute("lang")).toBe("en");
    const box = screen.getByRole("combobox", { name: "Search tools, clients and actions" });
    expect(box.getAttribute("placeholder")).toBe("Search tools, clients and actions");
    expect(screen.getByText("Arrows to move · Enter to open · Esc to close")).toBeTruthy();
    type("zzz");
    expect(screen.getByRole("status").textContent).toBe("Nothing found. Try another word.");
  });
});

describe("useCommandShortcut", () => {
  it("opens on Ctrl+K and Cmd+K from anywhere, and stops the browser's own use of them", () => {
    const onOpen = vi.fn();
    render(<Shortcut onOpen={onOpen} />);
    expect(fireEvent.keyDown(window, { key: "k", ctrlKey: true })).toBe(false);
    expect(fireEvent.keyDown(document.body, { key: "k", metaKey: true })).toBe(false);
    expect(fireEvent.keyDown(window, { key: "K", ctrlKey: true })).toBe(false); // caps lock on
    expect(fireEvent.keyDown(window, { key: "ל", code: "KeyK", ctrlKey: true })).toBe(false); // the same key on a Hebrew layout
    expect(onOpen).toHaveBeenCalledTimes(4);
  });

  it("ignores a plain K, other letters, K with Alt or Shift, and other layouts' letters in K's place", () => {
    const onOpen = vi.fn();
    render(<Shortcut onOpen={onOpen} />);
    expect(fireEvent.keyDown(window, { key: "k" })).toBe(true);
    fireEvent.keyDown(window, { key: "ל", code: "KeyK" });
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true, altKey: true });
    fireEvent.keyDown(window, { key: "K", ctrlKey: true, shiftKey: true });
    expect(fireEvent.keyDown(window, { key: "e", code: "KeyK", ctrlKey: true })).toBe(true); // Colemak's Ctrl+E
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does nothing while disabled, and stops listening when it unmounts", () => {
    const onOpen = vi.fn();
    const { rerender, unmount } = render(<Shortcut onOpen={onOpen} enabled={false} />);
    expect(fireEvent.keyDown(window, { key: "k", ctrlKey: true })).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
    rerender(<Shortcut onOpen={onOpen} enabled />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(onOpen).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens the palette it is wired to, and Ctrl+K inside the palette keeps it open", () => {
    function Studio() {
      const [isOpen, setOpen] = useState(false);
      const openPalette = useCallback(() => setOpen(true), []);
      useCommandShortcut(openPalette);
      return <CommandPalette open={isOpen} onClose={() => setOpen(false)} he items={makeItems()} />;
    }
    render(<Studio />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(input());
    expect(press("k", { ctrlKey: true })).toBe(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
